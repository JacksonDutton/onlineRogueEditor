# Editing Assistant (Word Add-in)

A Word task pane add-in for grammar/style suggestions and citation formatting,
backed by the [Claude Code CLI](https://claude.com/claude-code) running on your
machine — no separate API key needed, uses your existing Claude Code login.
Built with Office.js + TypeScript.

## Features

- **Grammar & style checker** — sends text to Claude (via the local `claude`
  CLI) and lists concrete suggestions (original phrase, suggested fix,
  explanation).
- **Citation formatter** — paste a rough source description, pick APA/MLA/Chicago,
  get a formatted citation back.
- **Text box** — paste text or pull the current Word selection, then insert the
  result back into the document normally (instant insert, no animation/typing
  simulation — this only ever does a plain `insertText` call).

The server (`server/index.ts`) shells out to `claude -p` (non-interactive print
mode) for each request, piping your text in on stdin. It does not read or write
any files in your document folder, and doesn't use any tools — it's a plain
text-in, JSON-out call.

## Setup

### 1. Make sure the Claude Code CLI is installed and logged in

```bash
claude --version
```

If that fails, install Claude Code first (see https://claude.com/claude-code),
then run `claude` once interactively to log in.

Each grammar/citation check spawns a `claude -p` call, which draws on your
Claude Code usage/subscription — it isn't free or unlimited, just doesn't need
a separate API key entered anywhere.

### 2. Install add-in dependencies

```bash
cd word-addin
npm install
```

### 3. Configure environment (optional)

```bash
cp .env.example .env
```

`CLAUDE_MODEL` is optional — leave it blank to use your account's default
model, or set it to an alias like `sonnet` or `haiku` to override.

### 4. Trust the local dev certificate

One-time, needed for Word to load the `https://localhost` task pane:

```bash
npx office-addin-dev-certs install
```

macOS will prompt you to allow adding a certificate to your keychain — approve it.

### 5. Start the servers (two terminal tabs)

```bash
npm run dev:server     # spawns `claude -p` per request, listens on :3001
npm run dev:taskpane   # serves the task pane UI on :3000
```

Leave both running while you use the add-in.

### 6. Sideload `manifest.xml` into Word on macOS

- Open Word → **Insert** tab → **Add-ins** → **My Add-ins** → gear icon /
  **Upload My Add-in** → select `manifest.xml` from this folder.
- Alternatively, copy `manifest.xml` into
  `~/Library/Containers/com.microsoft.Word/Data/Documents/wef` (create the
  `wef` folder if it doesn't exist), then restart Word and find it under
  **My Add-ins → Shared Folder**.

### 7. Open the task pane

Home tab → "Editing Assistant" button, or Insert → Add-ins.

## Project layout

```
word-addin/
  manifest.xml          Office add-in manifest (sideload this)
  src/taskpane/          Task pane UI (HTML/CSS/TS)
  server/                Local Express server that shells out to `claude -p`
  assets/                Task pane icons
```

## Notes

- No separate API key — auth is whatever your `claude` CLI is already logged
  in with. Each request consumes your normal Claude Code usage.
- The server runs on localhost with no auth, which is fine for personal use
  but not for sharing with others.
- Previously used a local Ollama model; if you still have it installed and
  don't need it for anything else, you can remove it:
  `brew services stop ollama && brew uninstall ollama` (and `rm -rf ~/.ollama`
  to delete downloaded model weights).
