export default {
  "tool": "Write",
  "tool_use_id": "toolu_017iYTeYgnBWCoaL6stFG55J",
  "input": {
    "file_path": "/private/tmp/claude-501/rec-k0nL/sample-app/src/middleware/rateLimit.ts",
    "content": "// In-memory fixed-window rate limiter. Single process only.\n// ponytail: no eviction, keys accumulate; add a TTL sweep if the key space grows.\nexport function rateLimiter(limit: number, windowMs: number) {\n  const hits = new Map<string, { count: number; start: number }>()\n  return (key: string, now = Date.now()): boolean => {\n    const hit = hits.get(key)\n    if (!hit || now - hit.start >= windowMs) {\n      hits.set(key, { count: 1, start: now })\n      return true\n    }\n    hit.count += 1\n    return hit.count <= limit\n  }\n}\n"
  },
  "result": {
    "type": "create",
    "filePath": "/private/tmp/claude-501/rec-k0nL/sample-app/src/middleware/rateLimit.ts",
    "content": "// In-memory fixed-window rate limiter. Single process only.\n// ponytail: no eviction, keys accumulate; add a TTL sweep if the key space grows.\nexport function rateLimiter(limit: number, windowMs: number) {\n  const hits = new Map<string, { count: number; start: number }>()\n  return (key: string, now = Date.now()): boolean => {\n    const hit = hits.get(key)\n    if (!hit || now - hit.start >= windowMs) {\n      hits.set(key, { count: 1, start: now })\n      return true\n    }\n    hit.count += 1\n    return hit.count <= limit\n  }\n}\n",
    "structuredPatch": [],
    "originalFile": null,
    "userModified": false
  }
}
