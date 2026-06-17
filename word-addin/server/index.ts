import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.");
}

const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const anthropic = new Anthropic({ apiKey });

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
    const message = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: GRAMMAR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const raw = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("");

    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to get grammar suggestions." });
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
    const message = await anthropic.messages.create({
      model,
      max_tokens: 512,
      system: CITATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Style: ${style}\n\nSource:\n${text}` }],
    });

    const raw = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("");

    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to format citation." });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Editing assistant API server listening on http://localhost:${port}`);
});
