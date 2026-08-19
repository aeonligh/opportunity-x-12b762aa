import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = pathToFileURL(`${process.cwd()}/src/`).href;

/** tsconfig's `moduleResolution: bundler` lets imports omit the extension. Node does not. */
const CANDIDATES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function firstExisting(href) {
  for (const suffix of CANDIDATES) {
    const candidate = `${href}${suffix}`;
    if (existsSync(fileURLToPath(candidate))) return candidate;
  }
  return null;
}

/**
 * JSX, which Node's own type stripper does not do.
 *
 * Node 22 strips type annotations from `.ts` natively, which is why the suite
 * can import the engine directly. It does not transform JSX, so a `.tsx`
 * component was unimportable and anything about a component had to be asserted
 * against its source text — a regex looking for a class name, which keeps
 * passing after the component stops rendering the thing the regex describes.
 *
 * esbuild is already in the tree as Vite's transformer. Fifteen lines of it here
 * means `test/state.test.ts` can render a skeleton and assert on the actual
 * output, which is the difference between checking that a component contains no
 * text and checking that a regex did not match.
 *
 * `.ts` is deliberately left to Node: routing it through esbuild as well would
 * mean the tests ran a transformed copy of the engine rather than the engine.
 */
/**
 * A stylesheet, to a bundler, is either a side effect or a URL. To Node it is a
 * syntax error.
 *
 * `__root.tsx` does `import appCss from "../styles.css?url"`, which Vite turns
 * into the emitted asset's path. A test that stands up the real route tree — to
 * render the shell against a real router, rather than asserting its source —
 * has to import that module, so Node needs an answer for the same import.
 *
 * The stand-in is the request path itself. Nothing under test reads the value;
 * what matters is that importing the module succeeds, so the routes it declares
 * can be exercised.
 */
function stylesheetStub(url) {
  const clean = url.split("?")[0];
  return {
    format: "module",
    source: `export default ${JSON.stringify(clean)};`,
    shortCircuit: true,
  };
}

export async function load(url, context, next) {
  if (url.includes(".css")) return stylesheetStub(url);
  if (!url.endsWith(".tsx")) return next(url, context);

  const { readFile } = await import("node:fs/promises");
  const { transform } = await import("esbuild");
  const source = await readFile(fileURLToPath(url), "utf8");
  const { code } = await transform(source, {
    loader: "tsx",
    format: "esm",
    target: "node22",
    jsx: "automatic",
    sourcefile: fileURLToPath(url),
  });

  return { format: "module", source: code, shortCircuit: true };
}

export function resolve(specifier, context, next) {
  const target = specifier.startsWith("@/")
    ? new URL(specifier.slice(2), src).href
    : specifier.startsWith(".") && context.parentURL
      ? new URL(specifier, context.parentURL).href
      : null;

  /* `?url` and `?raw` are bundler queries; the file beside them is real. */
  if (target !== null && /\.css(\?|$)/.test(target)) {
    return { url: target, format: "module", shortCircuit: true };
  }

  if (target !== null) {
    const found = firstExisting(target);
    if (found !== null) {
      /*
        The format is left to Node. Declaring `"module"` would route a `.ts`
        file past the type stripper and into the JavaScript parser, which fails
        on the first type annotation.
      */
      return { url: found, shortCircuit: true };
    }
  }

  return next(specifier, context);
}
