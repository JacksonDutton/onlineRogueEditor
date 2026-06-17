import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "node:child_process";

dotenv.config();

const claudeModel = process.env.CLAUDE_MODEL; // optional override, e.g. "sonnet" or "haiku"
const CLAUDE_TIMEOUT_MS = 90_000;

interface ClaudePrintResult {
  result: string;
  is_error: boolean;
}

function runClaude(systemPrompt: string, instruction: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["-p", instruction, "--output-format", "json", "--system-prompt", systemPrompt];
    if (claudeModel) {
      args.push("--model", claudeModel);
    }

    const child = spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("claude CLI timed out."));
    }, CLAUDE_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const wrapper = JSON.parse(stdout) as ClaudePrintResult;
        if (wrapper.is_error) {
          reject(new Error(wrapper.result));
          return;
        }
        resolve(wrapper.result);
      } catch {
        reject(new Error(`Failed to parse claude CLI output: ${stdout}`));
      }
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

function extractJson<T>(raw: string): T {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON object found in model output.");
  }
  return JSON.parse(match[0]) as T;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const GRAMMAR_SYSTEM_PROMPT = `You are a grammar and style checker. Given a passage of text piped to you on
stdin, identify concrete grammar, clarity, and style issues. Respond with ONLY a JSON object of the shape:
{"suggestions": [{"original": "...", "suggestion": "...", "explanation": "..."}]}
Each "original" must be an exact substring of the input text. If there are no issues, return an empty array.
Do not include any text outside the JSON object, and do not wrap it in markdown code fences.`;

app.post("/api/grammar", async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in request body." });
  }

  try {
    const raw = await runClaude(
      GRAMMAR_SYSTEM_PROMPT,
      "Check the piped text for grammar, clarity, and style issues and respond with the required JSON.",
      text
    );
    res.json(extractJson(raw));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to get grammar suggestions via the claude CLI. Is `claude` installed and logged in?" });
  }
});

const CITATION_SYSTEM_PROMPT = `You are a citation formatter. You will be given a target citation style and a
rough citation or source description piped to you on stdin. Respond with ONLY a JSON object of the shape:
{"formatted": "..."} containing the citation formatted in the requested style. If required fields are
missing, make a best-effort citation and note missing fields in brackets within the formatted string.
Do not include any text outside the JSON object, and do not wrap it in markdown code fences.`;

app.post("/api/citation", async (req, res) => {
  const { text, style } = req.body as { text?: string; style?: string };
  if (!text || !style) {
    return res.status(400).json({ error: "Missing 'text' or 'style' in request body." });
  }

  try {
    const raw = await runClaude(
      CITATION_SYSTEM_PROMPT,
      `Format the piped source description as a ${style} citation and respond with the required JSON.`,
      text
    );
    res.json(extractJson(raw));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to format citation via the claude CLI. Is `claude` installed and logged in?" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Editing assistant API server listening on http://localhost:${port}`);
  console.log(`Using the claude CLI${claudeModel ? ` with model "${claudeModel}"` : " (default model)"}`);
});
