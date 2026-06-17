# Editing Assistant (Word Add-in)

A Word task pane add-in for grammar/style suggestions and citation formatting,
backed by a local LLM via [Ollama](https://ollama.com) — no API key, no cloud
calls, runs entirely on your Mac. Built with Office.js + TypeScript.

## Features

- **Grammar & style checker** — sends text to a local model and lists concrete
  suggestions (original phrase, suggested fix, explanation).
- **Citation formatter** — paste a rough source description, pick APA/MLA/Chicago,
  get a formatted citation back.
- **Text box** — paste text or pull the current Word selection, then insert the
  result back into the document normally (instant insert, no animation/typing
  simulation — this only ever does a plain `insertText` call).

The model runs locally via Ollama; the add-in's server (`server/index.ts`) just
forwards requests to `http://localhost:11434`. Nothing leaves your machine.

## Setup

### 1. Install Ollama and pull a model

```bash
brew install ollama
brew services start ollama   # runs Ollama in the background, persists across reboots
ollama pull llama3.1:8b      # ~4.7GB download, needs ~8GB RAM free to run comfortably
```

Check it's working:

```bash
ollama run llama3.1:8b "say hi"
```

If your Mac has less RAM (8GB or under), use a smaller model instead, e.g.
`ollama pull llama3.2:3b`, and set `OLLAMA_MODEL=llama3.2:3b` in `.env` (step 3).

### 2. Install add-in dependencies

```bash
cd word-addin
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Defaults in `.env.example` point at `http://localhost:11434` with model
`llama3.1:8b` — only change these if you used a different model name above.

### 4. Trust the local dev certificate

One-time, needed for Word to load the `https://localhost` task pane:

```bash
npx office-addin-dev-certs install
```

macOS will prompt you to allow adding a certificate to your keychain — approve it.

### 5. Start the servers (two terminal tabs)

```bash
npm run dev:server     # proxies to Ollama on :3001
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
  server/                Local Express server proxying Ollama
  assets/                Task pane icons
```

## Notes

- Everything runs locally — no API key, no data sent off your machine.
- Grammar/citation quality will be noticeably below Claude/GPT-4-class models;
  an 8B local model is decent but makes more mistakes. If you later get an
  API key and want higher quality, the only change needed is swapping
  `callOllama()` in `server/index.ts` for a hosted API call.
- The server runs on localhost with no auth, which is fine for personal use
  but not for sharing with others.
