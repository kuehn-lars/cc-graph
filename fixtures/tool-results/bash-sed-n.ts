export default {
  "tool": "Bash",
  "tool_use_id": "toolu_0145w1QTobt5tTwhSF6czNx2",
  "input": {
    "command": "sed -n '1,5p' src/config.ts",
    "description": "Print first five lines of config"
  },
  "result": {
    "stdout": "// Application settings, read once from the environment.\n\nexport type Config = {\n  port: number\n  host: string",
    "stderr": "",
    "interrupted": false,
    "isImage": false,
    "noOutputExpected": false
  },
  "text": "// Application settings, read once from the environment.\n\nexport type Config = {\n  port: number\n  host: string",
  "isReadOnly": true
}
