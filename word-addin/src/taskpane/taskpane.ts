interface GrammarSuggestion {
  original: string;
  suggestion: string;
  explanation: string;
}

Office.onReady(() => {
  document.getElementById("app")!.classList.remove("hidden");

  document.getElementById("btn-get-selection")!.addEventListener("click", getSelection);
  document.getElementById("btn-insert")!.addEventListener("click", insertIntoDocument);
  document.getElementById("btn-check-grammar")!.addEventListener("click", checkGrammar);
  document.getElementById("btn-format-citation")!.addEventListener("click", formatCitation);
});

function setStatus(message: string): void {
  document.getElementById("status")!.textContent = message;
}

function getTextBox(): HTMLTextAreaElement {
  return document.getElementById("text-box") as HTMLTextAreaElement;
}

async function getSelection(): Promise<void> {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.load("text");
    await context.sync();
    getTextBox().value = range.text;
  });
}

async function insertIntoDocument(): Promise<void> {
  const text = getTextBox().value;
  if (!text) return;

  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.insertText(text, Word.InsertLocation.replace);
    await context.sync();
  });

  setStatus("Inserted into document.");
}

async function checkGrammar(): Promise<void> {
  const text = getTextBox().value;
  const list = document.getElementById("grammar-results")!;
  list.innerHTML = "";

  if (!text.trim()) {
    setStatus("Nothing to check.");
    return;
  }

  setStatus("Checking grammar/style...");

  try {
    const response = await fetch("/api/grammar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Server responded ${response.status}`);
    }

    const data: { suggestions: GrammarSuggestion[] } = await response.json();
    renderGrammarSuggestions(data.suggestions);
    setStatus(`Found ${data.suggestions.length} suggestion(s).`);
  } catch (err) {
    setStatus(`Error: ${(err as Error).message}`);
  }
}

function renderGrammarSuggestions(suggestions: GrammarSuggestion[]): void {
  const list = document.getElementById("grammar-results")!;
  list.innerHTML = "";

  for (const s of suggestions) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="original">${escapeHtml(s.original)}</span> &rarr;
      <span class="suggestion">${escapeHtml(s.suggestion)}</span>
      <span class="explanation">${escapeHtml(s.explanation)}</span>
    `;
    list.appendChild(li);
  }
}

async function formatCitation(): Promise<void> {
  const text = getTextBox().value;
  const style = (document.getElementById("citation-style") as HTMLSelectElement).value;
  const resultBox = document.getElementById("citation-result")!;
  resultBox.textContent = "";

  if (!text.trim()) {
    setStatus("Nothing to format.");
    return;
  }

  setStatus("Formatting citation...");

  try {
    const response = await fetch("/api/citation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, style }),
    });

    if (!response.ok) {
      throw new Error(`Server responded ${response.status}`);
    }

    const data: { formatted: string } = await response.json();
    resultBox.textContent = data.formatted;
    setStatus("Citation formatted.");
  } catch (err) {
    setStatus(`Error: ${(err as Error).message}`);
  }
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
