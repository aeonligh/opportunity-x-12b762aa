/*
 * Server-only, and it says so in code rather than only in its filename.
 *
 * This module reads ANTHROPIC_API_KEY. Until Phase 20 the
 * `.server.` suffix carried that meaning by convention alone: the build
 * protection had been narrowed to a directory pattern nothing here matches,
 * so a client component importing this compiled successfully and put the
 * credential name into the browser bundle. Measured, not supposed.
 *
 * The marker below is what the build now watches for. Importing it from
 * anything the client reaches is a build error, and evaluating it in a
 * browser throws. The suffix stays as documentation; this is the guarantee.
 */
import "@/lib/server-only";
/**
 * Shared Anthropic Claude client for server-side AI calls.
 * Server-only — never import from client code.
 * Calls api.anthropic.com directly using ANTHROPIC_API_KEY.
 */
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";

type ChatMessage = { role: string; content: string };

/**
 * What a model returned, before anything has been checked about it.
 *
 * This was `Promise<any>`, which let `result.score` typecheck as a number all
 * the way into a database write — for a value that arrives over the network
 * from a generative model and is under no obligation to be there at all. The
 * shape is not a contract; it is a hope.
 *
 * `Record<string, unknown>` keeps property access legal and makes every read
 * `unknown`, so a caller has to say what it expects before it can use it. The
 * call sites already did this in places (`typeof result.score === "number"`);
 * the type now requires it everywhere rather than rewarding whoever remembered.
 */
export type ModelJson = Record<string, unknown>;

/**
 * What came back, and whether it can be believed.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * WHY THIS IS NOT JUST THE PARSED VALUE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * It was, and three unlike things all returned `{}`:
 *
 *   - a safety classifier declining the request (`stop_reason: "refusal"`)
 *   - a response whose text is not parseable as JSON
 *   - a response carrying no text block at all
 *
 * An empty object is indistinguishable from "the model answered, and found
 * nothing". That is the same collapse this product refuses everywhere else —
 * an inability to read presented as an absence — sitting in the one module the
 * whole AI layer is supposed to go through.
 *
 * It has never fired, because nothing calls this yet. That is the reason to fix
 * it now rather than later: the first caller would inherit the collapse
 * silently, and `if (Object.keys(result).length === 0)` would become the
 * product's way of asking "did the model find anything?".
 *
 * Refusal is deliberately not an exception. It is an answer — the system asked,
 * and was told no — and a caller may reasonably carry on without that answer.
 * A network failure or a bad key still throws, because those are failures to
 * ask at all.
 */
export type ModelAnswer<T> =
  /** The model answered, and the answer was readable. */
  | { outcome: "answered"; value: T }
  /** A safety classifier declined. Nothing was learned; nothing failed. */
  | { outcome: "refused" }
  /** Something came back and could not be read. The raw text is kept so the
   *  caller can say what it saw rather than guess. */
  | { outcome: "unreadable"; raw: string };

export async function callClaude(
  messages: ChatMessage[],
  jsonMode?: true,
): Promise<ModelAnswer<ModelJson>>;
export async function callClaude(
  messages: ChatMessage[],
  jsonMode: false,
): Promise<ModelAnswer<string>>;
export async function callClaude(
  messages: ChatMessage[],
  jsonMode = true,
): Promise<ModelAnswer<ModelJson> | ModelAnswer<string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const system = messages.find((m) => m.role === "system")?.content;
  const conversation = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: conversation,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    if (res.status === 401) throw new Error("Anthropic API key is invalid or missing.");
    throw new Error(`Anthropic API error (${res.status}): ${text.slice(0, 200)}`);
  }

  const payload = await res.json();
  /* Safety classifiers can decline with a 200 + stop_reason: "refusal". */
  if (payload.stop_reason === "refusal") return { outcome: "refused" };

  const textBlock = (payload.content ?? []).find((b: { type: string }) => b.type === "text");
  /*
    No text block is not an empty answer. It means the response carried
    something this code does not understand, and saying so is the only honest
    option available.
  */
  if (typeof textBlock?.text !== "string") {
    return { outcome: "unreadable", raw: JSON.stringify(payload.content ?? null).slice(0, 500) };
  }

  const content: string = textBlock.text;
  if (!jsonMode) return { outcome: "answered", value: content };

  try {
    const match = content.match(/\{[\s\S]*\}/);
    const parsed: unknown = JSON.parse(match ? match[0] : content);
    /*
      `JSON.parse("7")` succeeds and is not an object. A caller reading
      properties off it gets `undefined` for everything, which reads as "the
      model answered and every field was absent".
    */
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { outcome: "unreadable", raw: content.slice(0, 500) };
    }
    return { outcome: "answered", value: parsed as ModelJson };
  } catch {
    return { outcome: "unreadable", raw: content.slice(0, 500) };
  }
}
