import { useState, useRef } from "react";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const DEFAULT_AXES = [
  { id: 1, leftLabel: "Owner/operator", rightLabel: "Builder/developer", value: 50 },
  { id: 2, leftLabel: "Realistic delivery", rightLabel: "Impressive timelines", value: 50 },
  { id: 3, leftLabel: "All of the above", rightLabel: "Renewable superiority", value: 50 },
  { id: 4, leftLabel: "Local Stories", rightLabel: "Macro Impact", value: 50 },
  { id: 5, leftLabel: "EU / Danish", rightLabel: "USA First", value: 50 },
  { id: 6, leftLabel: "Relationships/Service", rightLabel: "Product", value: 50 },
];

function describeAxis(axis) {
  const { leftLabel, rightLabel, value } = axis;
  if (value <= 15) return `emphatically "${leftLabel}" (avoid anything that sounds like "${rightLabel}")`;
  if (value <= 35) return `leaning toward "${leftLabel}"`;
  if (value <= 65) return `balanced between "${leftLabel}" and "${rightLabel}"`;
  if (value <= 85) return `leaning toward "${rightLabel}"`;
  return `emphatically "${rightLabel}" (avoid anything that sounds like "${leftLabel}")`;
}

function EditableLabel({ value, onChange, align }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onChange(trimmed);
    setEditing(false);
  }

  function handleKey(e) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`label-input label-input--${align}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
      />
    );
  }

  return (
    <span
      className={`axis-label axis-label--${align}`}
      onClick={startEdit}
      title="Click to edit"
    >
      {value}
    </span>
  );
}

function AxisRow({ axis, onChange, onDelete, showDelete }) {
  return (
    <div className="axis-row">
      <EditableLabel
        value={axis.leftLabel}
        onChange={(v) => onChange({ ...axis, leftLabel: v })}
        align="left"
      />
      <div className="slider-track">
        <input
          type="range"
          min={0}
          max={100}
          value={axis.value}
          onChange={(e) => onChange({ ...axis, value: Number(e.target.value) })}
          className="slider"
          style={{ "--pct": `${axis.value}%` }}
        />
      </div>
      <EditableLabel
        value={axis.rightLabel}
        onChange={(v) => onChange({ ...axis, rightLabel: v })}
        align="right"
      />
      {showDelete && (
        <button className="delete-btn" onClick={onDelete} title="Remove axis">
          ×
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [axes, setAxes] = useState(DEFAULT_AXES);
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(axes.length + 1);

  function updateAxis(updated) {
    setAxes((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  function deleteAxis(id) {
    setAxes((prev) => prev.filter((a) => a.id !== id));
  }

  function addAxis() {
    const id = ++nextId.current;
    setAxes((prev) => [
      ...prev,
      { id, leftLabel: "Option A", rightLabel: "Option B", value: 50 },
    ]);
  }

  async function generate() {
    if (!topic.trim()) {
      setError("Please enter a topic or brief.");
      return;
    }
    setError("");
    setLoading(true);
    setOutput("");

    const axisDescriptions = axes
      .map((a, i) => `  ${i + 1}. ${describeAxis(a)}`)
      .join("\n");

    const topicText = topic.trim();
    if (!topicText) {
      setError("Please enter a topic or brief.");
      setLoading(false);
      return;
    }

    const prompt = `You are a brand copywriter for Ørsted, the Danish global leader in offshore wind and renewable energy.

Generate a single punchy tagline for: "${topicText}"

The tagline's tone must reflect these positioning axes:
${axisDescriptions}

Rules:
- 5 to 10 words maximum
- No quotation marks, no hashtags, no full stops
- Return ONLY the tagline — no explanation, no alternatives`;

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 64,
        messages: [{ role: "user", content: prompt }],
      });
      const text = message.content.find((b) => b.type === "text")?.text ?? "";
      setOutput(text.trim());
    } catch (err) {
      setError(err.message ?? "Something went wrong. Check your API key.");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function resetAxes() {
    setAxes(DEFAULT_AXES.map((a) => ({ ...a })));
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="wordmark">
            <span className="wordmark-main">Ørsted</span>
            <span className="wordmark-sub">Copy Generator</span>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="topic-section">
          <label className="section-label">What is this copy for?</label>
          <input
            className="topic-input"
            type="text"
            placeholder="e.g. new offshore wind farm in the North Sea"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
        </section>

        <section className="axes-section">
          <div className="axes-header">
            <span className="section-label">Tone axes</span>
            <span className="axes-hint">Click any label to edit it</span>
          </div>

          {axes.map((axis) => (
            <AxisRow
              key={axis.id}
              axis={axis}
              onChange={updateAxis}
              onDelete={() => deleteAxis(axis.id)}
              showDelete={axes.length > 1}
            />
          ))}

          <div className="axes-actions">
            <button className="btn btn--ghost" onClick={addAxis}>
              + Add axis
            </button>
            <button className="btn btn--ghost" onClick={resetAxes}>
              Reset to defaults
            </button>
          </div>
        </section>

        <section className="generate-section">
          {error && <p className="error-msg">{error}</p>}
          <button
            className="btn btn--primary"
            onClick={generate}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              "Generate tagline"
            )}
          </button>
        </section>

        {output && (
          <section className="output-section">
            <p className="tagline-output">{output}</p>
            <button className="btn btn--copy" onClick={copyToClipboard}>
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
