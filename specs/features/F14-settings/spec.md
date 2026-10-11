# F14 Settings

| Status | Milestone | Owner | Checked against | Depends on |
| --- | --- | --- | --- | --- |
| Approved | v0.1, then one field per milestone | Lars Kühn (@kuehn-lars) | Claude Code 2.1.296 | none |

## Problem

People differ in how big a graph they want, which editor they use, and how much they want a mod to hold or change. Editing JSON to say so is error-prone, and a setting that silently does nothing, or that can be used to run something unexpected, is worse than none.

## Solution

A handful of settings appear in `/config` with a title and a description, each with a safe default. Each one ships with the feature that reads it, out-of-range values are brought into range, and the editor command can never be turned into extra arguments.

## User stories

1. As a developer, I want to change the node cap, the editor command and the opt-in features in `/config`, so that I never edit JSON.
2. As a developer in a big repository, I want to raise or lower the node cap, so that the graph fits my screen and my project.
3. As a privacy-minded developer, I want to switch thinking capture off, so that the mod holds no thinking at all.
4. As a developer outside a repository, or on a slow one, I want to switch the `git` work off, so that the mod runs no processes.
5. As a cautious developer, I want decision logging off unless I turn it on, so that nothing changes what Claude sees by default.
6. As a developer, I want a bad value corrected rather than obeyed, so that a typo never breaks the pane.

## Requirements

- **F14-R1** `plugin.json` declares these `userConfig` fields, each with `type`, `title`, `description` and `default`, each added in the milestone named:

  | Key | Type | Default | Range | Title | Ships in | Read by |
  | --- | --- | --- | --- | --- | --- | --- |
  | `maxNodes` | `number` | 60 | `min` 20, `max` 200 | Most files in the graph | v0.1 | I5, F09, F10 |
  | `blindSpots` | `boolean` | `true` | | Look for blind spots with git | v0.3 | F07 |
  | `captureThinking` | `boolean` | `true` | | Keep thinking excerpts | v0.4 | F05 |
  | `editorCommand` | `string` | `code -g {path}:{line}` | | Editor command | v0.4 | F11 |
  | `decisions` | `boolean` | `false` | | Let Claude log decisions | v0.6 | F12 |

- **F14-R2** The mod reads the values once, as `register(on, options)` receives them, and registers only the hooks the values call for. A change in `/config` reloads the module with new values; the mod does not watch for changes itself.
- **F14-R3** If `maxNodes` arrives outside 20 to 200, then the mod uses the nearest bound.
- **F14-R4** If `editorCommand` is empty, then the mod uses the default. If it has no `{path}`, then the mod adds the absolute path as the last argument.
- **F14-R5** The mod turns `editorCommand` into arguments by F11-R6: split on whitespace first, substitute inside each argument second (NFR-S4).
- **F14-R6** When `maxNodes` is lowered, the mod applies I5 at the next write to `graph`.

## Acceptance criteria

- **F14-AC1** `test(name, { options: { maxNodes: 20 } }, …)` keeps at most 20 file nodes through the reference session, evicting by I5, and keeps every changed file.
- **F14-AC2** With `captureThinking: false`, no note is stored and `turn.step` still passes every chunk.
- **F14-AC3** With the `userConfig` block, `claude plugin validate --json .` reports no error and no warning about `userConfig`.
- **F14-AC4** With `blindSpots: false`, a replay of the reference session raises no `process.run`.
- **F14-AC5** Given `maxNodes: 500` reaches `register`, then the cap is 200.
- **F14-AC6** Given `editorCommand` `idea --line {line} {path}`, the path `/w/a b.ts` and line 7, then the arguments are `['idea', '--line', '7', '/w/a b.ts']`.
- **F14-AC7** Given `editorCommand` `zed`, then pressing `o` on `src/a.ts` in `/w` runs `['zed', '/w/src/a.ts']`.

## Implementation decisions

- **One field per feature, shipped with it.** A field in `/config` that does nothing yet is a broken promise, so each lands in the milestone of the feature that reads it. This spec owns the contract and the shared rules.
- **Hooks follow the values.** Because options are fixed per activation, "off" means "not registered": thinking capture off has no `turn.step` hook, blind spots off runs no `git`, decisions off adds no tool and no prompt section.
- **Clamp as well as declare.** The manifest's `min` and `max` guide the dialog, and the mod clamps anyway, so a value written into `settings.json` by hand can never make the graph unbounded.
- **No `options` picker for the editor.** Editors and their flags vary too much for a fixed list; the substitution rule makes a free string safe.

## Testing decisions

- **Seam:** the engine test kit's `test(name, { options }, body)`, which hands the plugin its values as a load does (defaults filled, then validated). F14-AC3 is the CI validate step.
- F14-AC5 depends on F14-Q1: if the engine refuses an out-of-range value before `register` runs, the test asserts that refusal instead and the clamp stays as defence.

## Mods API used

| Need | Event or method |
| --- | --- |
| Declaring settings | `userConfig` in `.claude-plugin/plugin.json`: `type`, `title`, `description`, `default`, `min`, `max` |
| Reading them | `register(on, options)` (`PluginOptions`) |
| With `--plugin-dir` | `pluginConfigs` in settings, keyed `cc-graph` |

## Data model changes

None.

## Manual check

1. Install the mod from the local marketplace (`claude plugin marketplace add ./`, `claude plugin install cc-graph@cc-graph`) and open `/config`. The fields of the current milestone show with their titles and defaults.
2. Set `maxNodes` to 20 and run the reference session. The graph holds at most 20 files, and every changed file stays.
3. Set `editorCommand` to your editor and press `o` on a file with a space in its name.

## Out of scope

- Colour themes. The graph uses the person's theme colours where a surface offers them.
- Per-project settings. `pluginConfigs` follows Claude Code's own settings precedence.

## Open questions

- [ ] **F14-Q1** Does the engine refuse a `number` value outside its declared `min` and `max` before `register` runs, or pass it through? Does not block: F14-R3 clamps either way, and F14-AC5 records which behaviour the engine has in the red phase of v0.1.

## Changelog

- 2026-10-11 Draft.
- 2026-10-11 Review. Checked against the manifest schema (`title` and `description` are required). Each field now ships with its feature; "off" means "not registered"; added empty and `{path}`-less editor commands, and the argument rule shared with F11.
- 2026-10-11 Approved by the owner.
