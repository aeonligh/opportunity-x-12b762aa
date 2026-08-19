import { defineConfig, loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";

  // Inline VITE_-prefixed env vars as import.meta.env.* defines.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    ...(isDevBuild
      ? {
          environments: {
            client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
          },
          esbuild: { keepNames: true },
        }
      : {}),
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            // ══════════════════════════════════════════════════════════════
            // THE `.server.` PATTERN IS THE ONE THAT MATTERS, AND IT WAS GONE
            // ══════════════════════════════════════════════════════════════
            //
            // This option REPLACES the framework default rather than adding to
            // it, and the default protected every file matching the
            // `.server.` filename convention. Narrowing it to `**/server/**` —
            // a directory pattern nothing in this repository matches —
            // silently removed the only build-time thing enforcing what
            // CLAUDE.md states outright: that Vite will not bundle a
            // `.server.ts` module into the client.
            //
            // Measured, not assumed. A client component was given
            // `import { supabaseAdmin } from "@/integrations/supabase/client.server"`.
            // The build succeeded and SUPABASE_SERVICE_ROLE_KEY appeared in the
            // client bundle. The runtime guard does not cover it either:
            // `client.server.ts` does not import `@/lib/server-only`, because
            // it is the module that guard exists to protect rather than one of
            // its users.
            //
            // Restored, the same import is a build error — which is where a
            // service-role credential reaching a browser should be caught:
            // before an artifact exists, rather than by a grep over one after.
            //
            // (Written as line comments on purpose: the glob contains the
            // two characters that end a block comment, and the first version
            // of this note closed itself and broke the build.)
            // ══════════════════════════════════════════════════════════════
            // THE `.server.` PATTERN, RESTORED — AND MADE UNAMBIGUOUS
            // ══════════════════════════════════════════════════════════════
            //
            // This option REPLACES the framework default rather than adding to
            // it, and the default protected every file matching the `.server.`
            // convention. Narrowing it to `**/server/**` — a directory pattern
            // nothing in this repository matches — removed the only build-time
            // thing enforcing what CLAUDE.md states outright: that Vite will
            // not bundle a `.server.ts` module into the client.
            //
            // Measured, not supposed. A client component was given
            // `import { supabaseAdmin } from ".../client.server"`. The build
            // succeeded and SUPABASE_SERVICE_ROLE_KEY appeared in the client
            // bundle.
            //
            // Restoring the pattern alone was not enough, because the suffix
            // meant two different things here: `opportunities.server.ts`
            // exported `createServerFn`s and was *meant* to be imported by
            // routes, which the pattern then denied. Those modules are now
            // `*.functions.ts` — the convention `pursuit.functions.ts` already
            // used — so `.server.` means exactly one thing again: raw
            // server-only code holding credentials, never importable from the
            // client. The runtime guard in `@/lib/server-only` stays as the
            // second line; it cannot be the first, because a side-effect-only
            // module is tree-shaken before this plugin ever sees it.
            files: ["**/*.server.*", "**/server/**"],
            /*
              `@/lib/server-only` joins the bare specifier deliberately.

              Nine engine modules read credentials — the service-role key, the
              Firecrawl key — and each begins `import "@/lib/server-only"`,
              which throws if it is evaluated in a browser. That guard is
              honest about being weaker than what it replaced: it fails on first
              load rather than at build, so the first person to find out is
              whoever loads the page.

              The protection here was only ever matching the bare `server-only`
              specifier, which nothing in this repository imports — so the
              build-time half was never actually covering these modules. Naming
              the real specifier turns a client import of any of them into a
              build failure, which is where a credential leak should be caught.
              The runtime throw stays as the second line.
            */
            specifiers: ["server-only", "@/lib/server-only"],
          },
        },
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        server: { entry: "server" },
      }),
      // Nitro (build-only) — targets Vercel serverless functions.
      // Override with NITRO_PRESET at build time (e.g. NITRO_PRESET=cloudflare-module).
      ...(command === "build" ? [nitro({ defaultPreset: "vercel" })] : []),
      viteReact(),
    ],
  };
});
