#!/usr/bin/env bash
#
# What actually ships.
#
# ══════════════════════════════════════════════════════════════════════════
# WHY THIS INSPECTS THE BUILD AND NOT THE SOURCE
# ══════════════════════════════════════════════════════════════════════════
#
# Every claim about a trust boundary in this repository has, until now, been a
# claim about imports. "The service-role key is only read inside a server
# function" is a statement about where a line of code sits; whether it survived
# bundling, tree-shaking, inlining and an `import.meta.env` define is a
# different question, and the only thing that can answer it is the artifact.
#
# So this greps the built output. It is deliberately blunt: a literal search for
# the shapes a leak takes. A clever check that understands the bundler would
# share the bundler's blind spots.
#
# Run after `bun run build`, via `bun run verify:artifact`.

set -uo pipefail
cd "$(dirname "$0")/.."

CLIENT=".vercel/output/static"
SERVER=".vercel/output/functions/__server.func"

if [ ! -d "$CLIENT" ]; then
  echo "No build to inspect at $CLIENT — run 'bun run build' first." >&2
  exit 1
fi

pass=0; fail=0
G="\033[32m"; R="\033[31m"; N="\033[0m"
ok()   { printf "  ${G}PASS${N}  %s\n" "$1"; pass=$((pass+1)); }
bad()  { printf "  ${R}FAIL${N}  %s%s\n" "$1" "${2:+ — $2}"; fail=$((fail+1)); }

# absent <label> <pattern> <dir>
absent() {
  local label="$1" pattern="$2" dir="$3"
  local hits
  hits=$(grep -rl -- "$pattern" "$dir" 2>/dev/null | head -3 | tr '\n' ' ')
  if [ -z "$hits" ]; then ok "$label"; else bad "$label" "$hits"; fi
}

# present <label> <pattern> <dir>
present() {
  local label="$1" pattern="$2" dir="$3"
  if grep -rlq -- "$pattern" "$dir" 2>/dev/null; then ok "$label"; else bad "$label" "not found"; fi
}

echo
echo "── No credential reaches the browser"
# The two secrets named in CLAUDE.md, by variable name and by value shape.
absent "the service-role key's name is not in the client bundle" "SUPABASE_SERVICE_ROLE" "$CLIENT"
absent "no 'service_role' claim ships"                            "service_role"          "$CLIENT"
absent "the Anthropic key's name is not in the client bundle"     "ANTHROPIC_API_KEY"     "$CLIENT"
absent "no Anthropic key shape ships"                             "sk-ant-"               "$CLIENT"
# A JWT whose payload declares the service role. The anon/publishable key is a
# JWT too, so the header alone proves nothing — this looks for the role claim.
absent "no JWT carrying a service_role claim ships"               "InNlcnZpY2Vfcm9sZSI"   "$CLIENT"

echo
echo "── The publishable key is where it belongs, and only there"
present "the client has the Supabase project URL it must reach" "supabase.co" "$CLIENT"

echo
echo "── The fixture corpus is not shipped as product data"
# The laboratory's *shell* is code-split into the client build, which is inert:
# every laboratory server function calls assertDevelopment() and refuses off a
# development build. What must never ship is the corpus itself.
absent "the corpus builder does not ship"        "demoCorpus"                    "$CLIENT"
absent "no fixture opportunity title ships"      "Bilateral Education Agreement" "$CLIENT"
absent "no fixture organiser ships"              "Federal Ministry of Education" "$CLIENT"
absent "no fixture source host ships"            "education.gov.ng"              "$CLIENT"
absent "no fixture source host ships (2)"        "unn.edu.ng"                    "$CLIENT"

echo
echo "── The laboratory cannot serve data in production"
# The guard is server-side by design: it is the thing that makes the shipped
# shell harmless, so it must be in the server artifact and absent from the client.
present "the development guard is in the server artifact" "assertDevelopment" "$SERVER"
absent  "and is not something the client can satisfy"     "assertDevelopment" "$CLIENT"

echo
echo "── Nothing from the retired platform survives"
for pat in AEON aeon Lovable lovable "~oauth" fonotabhpkpreuegattz; do
  absent "no '$pat' in the client bundle" "$pat" "$CLIENT"
done
absent "no '~oauth' path in the server artifact" "~oauth" "$SERVER"

echo
echo "── Server-only modules stayed server-only"
absent "the model client does not ship to the browser" "api.anthropic.com" "$CLIENT"
absent "no server config reader ships"                 "getServerConfig"   "$CLIENT"

echo
printf "══ %s passed, %s failed\n" "$pass" "$fail"
[ "$fail" -eq 0 ]
