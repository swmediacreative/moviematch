import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // --- Allow requests from your Hostinger site ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- Parse request body safely ---
  let body;
  try {
    // Handle both object (already parsed) and string forms
    body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
  } catch (err) {
    console.error("Body parse error:", err);
    return res.status(400).json({ reply: "Invalid request body (parse error)" });
  }

  const { messages } = body || {};
  if (!messages || !Array.isArray(messages)) {
    console.error("Body missing 'messages':", body);
    return res.status(400).json({ reply: "Invalid request body (no messages)" });
  }

  try {
    // --- Add a random phrase for variation ---
    const randomPhrases = [
  "Let’s spin the cinematic wheel!",
  "Roll the director’s dice!",
  "Shuffle the film deck!",
  "Let fate pick a reel!",
];

// add random emojis and numeric seeds for true variation
const emojiSet = ["🎬", "🎞️", "🍿", "🎥", "📽️", "🎦"];
const emoji = emojiSet[Math.floor(Math.random() * emojiSet.length)];
const phrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];
const seed = Math.floor(Math.random() * 100000);

const systemPrompt = `
${emoji} ${phrase} (session ${seed})

You are Movie Match, a witty film expert who gives exactly one movie recommendation per chat,
introduced as "Here's today's Choice!". Each reply includes:
• a short, spoiler-free summary
• a reason to watch
• where it’s usually available to stream/rent
• and a fun trivia fact.
Keep it conversational, punchy, and spoiler-free.
`;


    // --- Call OpenAI ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",  // reliable & fast
      temperature: 0.9,
      top_p: 1,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const reply = completion.choices[0]?.message?.content || "No reply generated.";
    res.status(200).json({ reply });
  } catch (error) {
    console.error("Movie Match API Error:", error);
    res.status(500).json({
      reply: "🎞️ Oops! Something went wrong — try again in a moment.",
    });
  }
}
