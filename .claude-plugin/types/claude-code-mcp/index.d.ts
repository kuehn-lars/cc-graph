// The inputs of the MCP tools the session had connected when this mod
// was last saved, from each server's tools/list inputSchema.
// Merges into the engine's ToolCallInput (types/ McpToolInputs) so
// `e.tool === "mcp__<server>__<tool>"` narrows to the tool's arguments.
// Written again at a save of the mod with a server connected.
export {}
declare module 'claude-code' {
  interface McpToolInputs {
    /** Create a doc, or apply several operations to one doc atomically. */
    mcp__claude_ai_Claude_Docs__batch: {
      batch?: unknown[]
      container?: {
        kind: string
        id?: string
        create?: {}
      }
      verbose?: boolean
      opId?: string
    }
    /** Create one object in a doc: a tab, its contents, a comment, an upload record. */
    mcp__claude_ai_Claude_Docs__create: {
      object: "file" | "node" | "utterance" | "enum" | "blob"
      engine?: string
      payload: {} | string
      container?: {
        kind: string
        id: string
        version?: string
      }
      verbose?: boolean
      opId?: string
      artifact?: string
    }
    /** Delete one object from a doc: a tab, its contents, a comment, an upload record. A doc keeps at least one tab (deleting its last refuses `last_tab`): to start over, rewrite that tab's contents with `update`, never delete and recreate the tab. */
    mcp__claude_ai_Claude_Docs__delete: {
      ref: {
        object: "project" | "file" | "node" | "utterance"
        id: string
      }
      engine?: string
      container?: {
        kind: string
        id: string
        version?: string
      }
      payload?: {} | string
      verbose?: boolean
      opId?: string
    }
    /** Export one tab inline as base64: pdf, docx, html, text, markdown or notion (Notion-flavored markdown, what notion-create-pages takes). To just keep the file in the doc's files, create a blob {from: {object: "file", id}, format} instead (no large result). */
    mcp__claude_ai_Claude_Docs__export: {
      container: {
        kind: string
        id: string
        version?: string
      }
      file: string
      format: "markdown" | "text" | "html" | "docx" | "pdf" | "notion"
      paper?: "letter" | "a4"
      maxBytes?: number
    }
    /** Docs guides: topic.instructions repeats the server instructions. Read it only if your client dropped them. Also topic.<name>, refusal.<code>. After a doc's birth → ["topic.index"]. */
    mcp__claude_ai_Claude_Docs__guide: {
      /** topic.<name> (instructions, index, editing, tabs, comments, charts, chart-definition, diagram, uploads, sharing, skill) or refusal.<code>; several per call is fine. */
      items?: unknown[]
    }
    /** List a tab's or a doc's comment history (threads, replies, resolves). */
    mcp__claude_ai_Claude_Docs__query: {
      container?: {
        kind: string
        id: string
        version?: string
      }
      object?: "utterance"
      payload?: {} | string
    }
    /** Read a doc (lists its tabs), a tab's contents, or a comment. A claude.ai/[code/]artifact/[<title>-]<id> link → `ref {"object":"project","id":"<id>"}` first; reads inside it take `container {"kind":"project","id":"<id>"}`. */
    mcp__claude_ai_Claude_Docs__read: {
      ref: {
        object: "project" | "file" | "node" | "utterance" | "enum" | "blob"
        id: string
      }
      engine?: string
      container?: {
        kind: string
        id: string
        version?: string
      }
      payload?: {} | string
    }
    /** Edit a tab's contents, rename a doc or tab, or change a stored value. */
    mcp__claude_ai_Claude_Docs__update: {
      ref: {
        object: "project" | "file" | "node" | "utterance" | "enum"
        id: string
      }
      engine?: string
      payload: {} | string
      container?: {
        kind: string
        id: string
        version?: string
      }
      verbose?: boolean
      opId?: string
      answering?: string
    }
    /** Save a video as a Markdown note in the user's notes folder, so they can find it again later. Use it only when the user asks to save, keep or note a video. The note holds the video's facts as YAML frontmatter (title, source, platform, author, upload date, duration in seconds, language, hashtags, date saved), your summary if you pass one, the platform's caption, the transcript and the on-screen text with timestamps. Frames and the video itself are never saved. Call understand_video first and write the summary from its result: the server remembers the text of the last 32 videos until it restarts, so saving one of them is instant. Any other video is processed again first, which takes as long as understand_video. The folder is the SHORTFORM_NOTES_DIR setting (~/shortform-mcp/notes unless set). A note is never overwritten: if the name is taken, a number is added. Returns the note's path. */
    mcp__shortform__save_note: {
      /** The video's link or local file path, as passed to understand_video (the Source line of its result works too). */
      source: string
      /** Your summary of the video for the note, in Markdown; stored exactly as given. Omit it to save the note without one. */
      summary?: string | null
      /** A short title for the note and its file name. Omit it to use the platform's title, or the file name for a local file. */
      title?: string | null
    }
    /** Understand a short-form video so you can summarize it, answer questions about it or describe it. Returns what the server extracted from the video, plus warnings naming anything it could not extract. The server does not summarize; you do. Returns what is said: the detected language and a transcript with timestamps, or an explicit "no speech" for music, silence or a missing audio track. Transcription runs locally on the CPU and takes about a quarter of the video's length on a recent laptop (longer on older machines, and when the server runs in its low performance mode); the very first call also downloads the speech model (about 0.5 GB). Transcripts can contain recognition errors, and sung lyrics may be transcribed as speech. Returns what is shown: up to max_frames still images (JPEG, upright, long edge at most 768 px), one from the middle of each equal part of the video and at most one per second, each labelled with its time on the transcript's clock. A quick cut between two frames is not seen. Images are the largest part of the result: pass fewer frames to save context, more for a fast-cut video, or 0 for none. Also returns the video's duration, size in pixels, orientation and frame rate. Returns what is written on screen: captions, titles and other text in the picture, read locally from the whole video every 0.5 s (every 1 s in the server's low performance mode; the result says which), not only from the returned frames, as lines with the first and last time each was seen. Reading takes about a fifth of the video's length on a recent laptop. Expect recognition errors and platform watermarks or app text (e.g. "TikTok" and the author's handle); text shown for less time than the reading interval can be missed. Latin-script languages, Chinese and Japanese are read; Cyrillic, Greek, Korean and Arabic are not. Burned-in captions usually repeat the speech, so they can confirm or correct the transcript, e.g. for names. For a link, also returns what the platform says: title, author, upload date, caption and hashtags. The video is downloaded to a temporary folder and deleted after the call; downloading takes a few seconds. Instagram Reels, TikTok and YouTube Shorts are supported, and so are most other video sites (X, Facebook, Snapchat, Reddit, Vimeo, Pinterest, Bluesky, Twitch clips and many more) and direct links to video files. Private or login-only videos fail with a message saying so. A link to a playlist, carousel or profile gives its first video. Current limits: videos up to 10 minutes by default; no live streams; one video at a time (further calls wait). Clients that show progress see how far reading the text and transcribing have come. */
    mcp__shortform__understand_video: {
      /** A link to the video, as copied from the app or browser (e.g. https://www.instagram.com/reel/..., https://www.tiktok.com/@user/video/..., https://youtube.com/shorts/...), or the absolute path of a local video file. */
      source: string
      /** How many still images to return, spread evenly over the video (at most one per second). 0 returns no images; the text parts still come back. */
      max_frames?: number
    }
  }
}
