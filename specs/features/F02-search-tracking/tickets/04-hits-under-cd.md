# 04: Hits under `cd <dir> &&`

**What to build:** When Claude runs a search after `cd src &&`, its relative hits name the right files: `cd src && rg -n verify auth` printing `auth/password.ts:12:…` counts for `src/auth/password.ts`. When the directory cannot be known (a variable, `cd -`, a subshell), that search's hits are dropped rather than put on the wrong file.

`searchesIn` records a working directory for each search: the session's working directory, or the literal path of a `cd` that comes before it in the same command, joined by `&&`. Hit paths resolve against that directory, then go through the I4 normalization F01 uses.

Requirements: F02-R8.

**Blocked by:** 02 Searches inside pipelines and command chains (needs the `&&` split)

**Status:** ready-for-agent

- [ ] Table-driven `searchesIn` cases: a literal relative `cd`, an absolute `cd`, two `cd`s in a row, `cd $DIR`, `cd -`, `(cd src && rg …)`
- [ ] F02-AC8 `cd src && rg -n verify auth` gives `src/auth/password.ts` (captured `rg-n-verify-auth-in-src` output)
- [ ] A search after an unknown directory changes nothing
- [ ] The check command passes
