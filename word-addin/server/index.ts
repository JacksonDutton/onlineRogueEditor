import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

async function callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(`${ollamaHost}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama responded ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { message: { content: string } };
  return data.message.content;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const GRAMMAR_SYSTEM_PROMPT = `You are a grammar and style checker. Given a passage of text, identify concrete
grammar, clarity, and style issues. Respond with ONLY a JSON object of the shape:
{"suggestions": [{"original": "...", "suggestion": "...", "explanation": "..."}]}
Each "original" must be an exact substring of the input text. If there are no issues, return an empty array.
Do not include any text outside the JSON object.`;

app.post("/api/grammar", async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in request body." });
  }

  try {
    const raw = await callOllama(GRAMMAR_SYSTEM_PROMPT, text);
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to get grammar suggestions. Is Ollama running (`ollama serve`)?" });
  }
});

const CITATION_SYSTEM_PROMPT = `You are a citation formatter. Given a rough citation or source description and a
target style (APA, MLA, or Chicago), respond with ONLY a JSON object of the shape:
{"formatted": "..."} containing the citation formatted in the requested style. If required fields are
missing, make a best-effort citation and note missing fields in brackets within the formatted string.`;

app.post("/api/citation", async (req, res) => {
  const { text, style } = req.body as { text?: string; style?: string };
  if (!text || !style) {
    return res.status(400).json({ error: "Missing 'text' or 'style' in request body." });
  }

  try {
    const raw = await callOllama(CITATION_SYSTEM_PROMPT, `Style: ${style}\n\nSource:\n${text}`);
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to format citation. Is Ollama running (`ollama serve`)?" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Editing assistant API server listening on http://localhost:${port}`);
  console.log(`Using Ollama at ${ollamaHost} with model "${model}"`);
});
