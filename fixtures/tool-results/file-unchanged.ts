// DERIVED from the type, not recorded: no session of Claude Code 2.1.296 returned `file_unchanged` (see README.md).
// The result is the `type: "file_unchanged"` variant of the Read result in .claude-plugin/types/claude-code-tools/index.d.ts;
// the call is the recorded `read-whole` one. Replace this module with a recording when a build returns one.
import readWhole from './read-whole'

export default {
  tool: 'Read',
  tool_use_id: readWhole.tool_use_id,
  input: readWhole.input,
  result: { type: 'file_unchanged', file: { filePath: readWhole.input.file_path } },
}
