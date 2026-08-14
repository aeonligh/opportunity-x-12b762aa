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

export function resolve(specifier, context, next) {
  const target = specifier.startsWith("@/")
    ? new URL(specifier.slice(2), src).href
    : specifier.startsWith(".") && context.parentURL
      ? new URL(specifier, context.parentURL).href
      : null;

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
