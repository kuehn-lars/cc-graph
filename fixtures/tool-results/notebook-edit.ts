export default {
  "tool": "NotebookEdit",
  "tool_use_id": "toolu_01Wj9FJv2w6U17tUjAX8EJNv",
  "input": {
    "notebook_path": "/private/tmp/claude-501/rec-k0nL/sample-app/notes.ipynb",
    "edit_mode": "replace",
    "cell_id": "calc",
    "new_source": "print(\"hi\")"
  },
  "result": {
    "new_source": "print(\"hi\")",
    "old_source": "x = 1\nprint(x)",
    "cell_type": "code",
    "language": "python",
    "edit_mode": "replace",
    "cell_id": "calc",
    "error": "",
    "notebook_path": "/private/tmp/claude-501/rec-k0nL/sample-app/notes.ipynb",
    "original_file": "{\n \"cells\": [\n  {\n   \"cell_type\": \"markdown\",\n   \"id\": \"intro\",\n   \"metadata\": {},\n   \"source\": [\n    \"# Notes\\n\",\n    \"Sample notebook\"\n   ]\n  },\n  {\n   \"cell_type\": \"code\",\n   \"id\": \"calc\",\n   \"metadata\": {},\n   \"execution_count\": null,\n   \"outputs\": [],\n   \"source\": [\n    \"x = 1\\n\",\n    \"print(x)\"\n   ]\n  }\n ],\n \"metadata\": {\n  \"kernelspec\": {\n   \"display_name\": \"Python 3\",\n   \"language\": \"python\",\n   \"name\": \"python3\"\n  }\n },\n \"nbformat\": 4,\n \"nbformat_minor\": 5\n}",
    "updated_file": "{\n \"cells\": [\n  {\n   \"cell_type\": \"markdown\",\n   \"id\": \"intro\",\n   \"metadata\": {},\n   \"source\": [\n    \"# Notes\\n\",\n    \"Sample notebook\"\n   ]\n  },\n  {\n   \"cell_type\": \"code\",\n   \"id\": \"calc\",\n   \"metadata\": {},\n   \"execution_count\": null,\n   \"outputs\": [],\n   \"source\": \"print(\\\"hi\\\")\"\n  }\n ],\n \"metadata\": {\n  \"kernelspec\": {\n   \"display_name\": \"Python 3\",\n   \"language\": \"python\",\n   \"name\": \"python3\"\n  }\n },\n \"nbformat\": 4,\n \"nbformat_minor\": 5\n}"
  }
}
