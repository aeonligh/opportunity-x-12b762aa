/**
 * Render one component to HTML, in a process that is allowed to.
 *
 * The suite runs under `--conditions=react-server`, which the engine needs and
 * which makes `react-dom/server` refuse to load — so a test that wants to look
 * at real rendered output cannot do it in-process. Rather than drop to asserting
 * on source text (which is how a test ends up passing against a component that
 * no longer renders what the regex is looking for), the assertion runs here, in
 * a child process started without that condition, and the caller reads stdout.
 *
 * Usage: `node --import ./test/register.mjs test/render-component.ts <module> <export> [propsJson]`
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const [, , specifier, exported, propsJson] = process.argv;

const module_ = (await import(specifier)) as Record<string, unknown>;
const component = module_[exported];

if (typeof component !== "function") {
  throw new Error(`${specifier} has no component export named ${exported}`);
}

process.stdout.write(
  renderToStaticMarkup(
    createElement(
      component as Parameters<typeof createElement>[0],
      propsJson ? (JSON.parse(propsJson) as Record<string, unknown>) : {},
    ),
  ),
);
