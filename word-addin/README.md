# Editing Assistant (Word Add-in)

A Word task pane add-in for grammar/style suggestions and citation formatting,
backed by the Claude API. Built with Office.js + TypeScript.

## Features

- **Grammar & style checker** — sends text to Claude and lists concrete suggestions
  (original phrase, suggested fix, explanation).
- **Citation formatter** — paste a rough source description, pick APA/MLA/Chicago,
  get a formatted citation back.
- **Text box** — paste text or pull the current Word selection, then insert the
  result back into the document normally (instant insert, no animation/typing
  simulation — this only ever does a plain `insertText` call).

The Claude API key lives in a small local Express server (`server/index.ts`), not
in the browser-side task pane code, so it's never bundled into client JS.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your Anthropic API key:

   ```bash
   cp .env.example .env
   # then edit .env
   ```

3. Trust the local dev certificate (one-time, needed for Word to load the
   `https://localhost` task pane):

   ```bash
   npx office-addin-dev-certs install
   ```

4. Start the API server and the task pane dev server (two terminals):

   ```bash
   npm run dev:server
   npm run dev:taskpane
   ```

5. Sideload `manifest.xml` into Word on macOS:
   - Open Word → **Insert** tab → **Add-ins** → **My Add-ins** → gear icon /
     **Upload My Add-in** → select `manifest.xml` from this folder.
   - Alternatively, copy `manifest.xml` into
     `~/Library/Containers/com.microsoft.Word/Data/Documents/wef` (create the
     `wef` folder if it doesn't exist), then restart Word and find it under
     **My Add-ins → Shared Folder**.

6. Open the task pane from the Home tab ("Editing Assistant" button) or via
   Insert → Add-ins.

## Project layout

```
word-addin/
  manifest.xml          Office add-in manifest (sideload this)
  src/taskpane/          Task pane UI (HTML/CSS/TS)
  server/                Local Express server proxying the Claude API
  assets/                Task pane icons
```

## Notes

- This is set up for personal/local use (sideloaded, not published to AppSource).
- The server keeps your API key out of client code; it still runs on localhost
  with no auth, which is fine for personal use but not for sharing with others.
