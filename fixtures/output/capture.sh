#!/usr/bin/env bash
# Captures real search and git output in a fresh copy of fixtures/sample-app.
# Writes one <name>.txt per command, and index.json with each command, its
# folder (relative to the copy's root) and its exit code. Run from anywhere.
set -euo pipefail

out="$(cd "$(dirname "$0")" && pwd)"
app="$out/../sample-app"
work="$(mktemp -d)/sample-app"
cp -R "$app" "$work"
cd "$work"
git init -q && git add -A && git -c user.name=fixture -c user.email=fixture@example.com commit -qm init

index='{}'
run() { # run <name> <dir> <command>
  local name=$1 dir=$2 cmd=$3 code=0
  (cd "$work/$dir" && bash -c "$cmd") > "$out/$name.txt" 2>/dev/null || code=$?
  index=$(jq --arg n "$name" --arg d "$dir" --arg c "$cmd" --argjson x "$code" \
    '.[$n] = { command: $c, cwd: $d, exitCode: $x }' <<< "$index")
}

# Searches (F02)
run rg-n-verify-src-auth . 'rg -n "verify" src/auth'
run rg-verify-src . 'rg verify src'
run rg-l-verify . 'rg -l verify'
run rg-c-verify-src . 'rg -c verify src'
run rg-verify-login . 'rg verify src/auth/login.ts'
run rg-n-A1-verify-src-auth . 'rg -n -A1 verify src/auth'
run rg-n-verify-src-head . 'rg -n verify src | head -20'
run rg-n-verify-auth-in-src src 'rg -n verify auth'
run rg-files . 'rg --files'
run grep-rn-verify-src . 'grep -rn verify src'
run grep-rl-verify-src . 'grep -rl verify src'
run git-grep-n-verify . 'git grep -n verify'
# log.txt exists in this capture copy only; the sample app stays as it is.
printf 'start\nerror: token expired\nlogin ok\nerror: store down\n' > log.txt
run cat-log-rg-n-error . 'cat log.txt | rg -n error'
run grep-rn-verify-then-ls . "grep -rn verify src ; echo '---'; ls src src/*"

# Blind spots (F07): root, clean baseline, importers of login.ts
git_ro='GIT_OPTIONAL_LOCKS=0 git'
run git-rev-parse-toplevel src "$git_ro rev-parse --show-toplevel"
run git-status-clean . "$git_ro status --porcelain=v1 -z --untracked-files=all"
run git-grep-importers-login . "$git_ro grep -n -I --untracked -E -e \"(import|export|require|from)[^'\\\"]*['\\\"][^'\\\"]*/login['\\\"]\" -- '*.ts' '*.tsx' '*.mts' '*.cts' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.py'"

# Reference session step 6 and 9: a file Claude created, then npm install
mkdir -p src/middleware && printf 'export const rateLimit = () => {}\n' > src/middleware/rateLimit.ts
npm install --no-audit --no-fund --loglevel=error rate-limiter-flexible > /dev/null
run git-status-after-npm-install . "$git_ro status --porcelain=v1 -z --untracked-files=all"

# Porcelain variety: staged rename, deletion, a path with a space
git mv src/db/redis.ts src/db/store.ts
rm test/helpers.ts
printf 'x\n' > 'notes with space.md'
run git-status-variety . "$git_ro status --porcelain=v1 -z --untracked-files=all"

# Commits, merges (F07-R14): HEAD, and the diff of what a commit and a merge changed, in a repository of their own
work2="$(mktemp -d)/sample-app"
cp -R "$app" "$work2"
cd "$work2"
git init -q -b main && git add -A && git -c user.name=fixture -c user.email=fixture@example.com commit -qm init
gc() { git -c user.name=fixture -c user.email=fixture@example.com "$@"; }
work="$work2"
run git-rev-parse-head . "$git_ro rev-parse HEAD"
git rm -q test/helpers.ts && gc commit -qm "drop helpers"
run git-diff-commit-delete . "$git_ro diff --name-status -z --no-renames HEAD~1 HEAD"
git checkout -q -b side && printf 'x\n' > side.txt && git add side.txt && gc commit -qm side && git checkout -q main
printf 'y\n' > other.txt && git add other.txt && gc commit -qm other
gc merge -q --no-ff -m merge side
run git-diff-merge-add . "$git_ro diff --name-status -z --no-renames HEAD~1 HEAD"
mkdir -p notes && printf 'b\n' > notes/b.md && git add notes/b.md && gc commit -qm b
run git-diff-commit-untracked . "$git_ro diff --name-status -z --no-renames HEAD~1 HEAD"

# A named change (F07-R17): a line appended to a tracked file
work3="$(mktemp -d)/sample-app"
cp -R "$app" "$work3"
cd "$work3"
git init -q && git add -A && git -c user.name=fixture -c user.email=fixture@example.com commit -qm init
work="$work3"
printf '// probe\n' >> src/db/redis.ts
run git-status-appended . "$git_ro status --porcelain=v1 -z --untracked-files=all"

# Outside a repository (F07-AC4)
none="$(mktemp -d)"
code=0; (cd "$none" && GIT_OPTIONAL_LOCKS=0 git rev-parse --show-toplevel) > "$out/git-rev-parse-outside.txt" 2>&1 || code=$?
index=$(jq --arg x "$code" '.["git-rev-parse-outside"] = { command: "GIT_OPTIONAL_LOCKS=0 git rev-parse --show-toplevel", cwd: "(not a repository)", exitCode: ($x | tonumber), stderr: true }' <<< "$index")

printf '%s\n' "$index" > "$out/index.json"
"$out/to-module.sh"
echo "captured $(jq length <<< "$index") outputs from $work"
