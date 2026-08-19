/**
 * Render the authenticated shell at a given location, with a real router.
 *
 * The shell's current-destination marking is computed by TanStack's `Link`
 * against the router's location — so asserting it from source would test that
 * `activeProps` is spelled correctly, not that a person on `/saved` is told
 * they are on Saved. This stands up a real router over the real generated route
 * tree, pins it to a path with a memory history, and renders the real shell
 * inside it. What comes out is what the browser would produce.
 *
 * Runs in a child process for the same reason as `render-component.ts`: the
 * suite runs under `--conditions=react-server`, which makes `react-dom/server`
 * refuse to load.
 *
 * Usage: `node --import ./test/register.mjs test/render-shell.ts <path>`
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { createRouter, createMemoryHistory, RouterContextProvider } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";
import { AppShell } from "@/components/shell/AppShell";

const [, , path = "/opportunities"] = process.argv;

const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: [path] }),
});

await router.load();

process.stdout.write(
  renderToStaticMarkup(
    createElement(
      RouterContextProvider,
      { router } as never,
      createElement(AppShell, { email: "you@example.test" }, null),
    ),
  ),
);
