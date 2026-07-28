/**
 * Shared Anthropic Claude client for server-side AI calls.
 * Server-only — never import from client code.
 * Calls api.anthropic.com directly using ANTHROPIC_API_KEY.
 */
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";

type ChatMessage = { role: string; content: string };

export async function callClaude(messages: ChatMessage[], jsonMode = true): Promise<any> {
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
  // Safety classifiers can decline a request with a 200 + stop_reason: "refusal".
  if (payload.stop_reason === "refusal") return jsonMode ? {} : "";

  const textBlock = (payload.content ?? []).find((b: { type: string }) => b.type === "text");
  const content: string = textBlock?.text ?? "";
  if (!jsonMode) return content;

  try {
    const match = content.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : content);
  } catch {
    return {};
  }
}
