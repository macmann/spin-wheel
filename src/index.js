import 'dotenv/config';
import OpenAI from 'openai';

/**
 * Minimal example that asks an OpenAI model to generate code.
 * Usage:
 *   npm start
 *   npm run gen -- "Write a function in Go that reverses a slice of ints."
 */

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Read the prompt from CLI args or use a default
const userPrompt = process.argv.slice(2).join(' ') || "Write a function in JavaScript that reverses a string.";

const systemPrompt = [
  "You are a focused coding assistant.",
  "Return only runnable code unless comments are necessary.",
  "Prefer minimal examples with clear function names and no extra explanation."
].join("\n");

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY. Put it in .env (see .env.example).");
    process.exit(1);
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const output = completion.choices?.[0]?.message?.content?.trim() || "";
    // If the model returns fenced code, strip the fences for convenience
    const cleaned = output.replace(/^```[a-zA-Z]*\n?|```$/g, '');
    console.log(cleaned);
  } catch (err) {
    console.error("OpenAI error:", err?.response?.data ?? err.message ?? err);
    process.exit(1);
  }
}

main();
