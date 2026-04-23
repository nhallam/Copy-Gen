import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, axisDescriptions, min, max } = req.body;

  if (!topic?.trim() || !axisDescriptions) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const prompt = `You are a brand copywriter for Ørsted, the Danish global leader in offshore wind and renewable energy.

Generate a single punchy tagline for: "${topic.trim()}"

The tagline's tone must reflect these positioning axes:
${axisDescriptions}

Rules:
- Between ${min} and ${max} words
- No quotation marks, no hashtags, no full stops
- Return ONLY the tagline — no explanation, no alternatives`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 64,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content.find((b) => b.type === "text")?.text ?? "";
    res.status(200).json({ tagline: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Something went wrong" });
  }
}
