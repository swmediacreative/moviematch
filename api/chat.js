import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // --- Allow cross-origin calls from your Hostinger site ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // --- Parse request body safely ---
  let body;
  try {
    body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
  } catch (err) {
    console.error("Body parse error:", err);
    return res.status(400).json({ reply: "Invalid request body" });
  }

  const { messages } = body || {};
  if (!messages || !Array.isArray(messages)) {
    console.error("Body missing 'messages':", body);
    return res.status(400).json({ reply: "Invalid request body" });
  }

  try {
    // --- Random elements for variation ---
    const randomPhrases = [
      "Let’s spin the cinematic wheel!",
      "Roll the director’s dice!",
      "Shuffle the film deck!",
      "Let fate pick a reel!",
    ];
    const emojiSet = ["🎬", "🎞️", "🍿", "🎥", "📽️", "🎦"];
    const emoji = emojiSet[Math.floor(Math.random() * emojiSet.length)];
    const phrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];
    const seed = Math.floor(Math.random() * 100000);

    // --- Random genre seed to diversify results ---
    const genreSeeds = [
      "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Fantasy",
      "Thriller", "Romance", "Documentary", "Mystery", "Adventure"
    ];
    const randomGenre = genreSeeds[Math.floor(Math.random() * genreSeeds.length)];

    // --- Witty, dynamic system prompt ---
    const systemPrompt = `
${emoji} ${phrase} (session ${seed})
Today’s secret theme: ${randomGenre}.

You are Movie Match, a witty film expert who must NOT repeat the same movie twice in a row.
Avoid 'The Grand Budapest Hotel' unless it’s directly relevant.
Pick a random movie from any era and genre, introduced as "Here's today's Choice!".
Each reply includes:
• a short, spoiler-free summary
• a reason to watch
• where it’s usually available
• a fun trivia fact
Stay witty, concise, and always vary your picks.
`;

    // --- Generate the recommendation ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Reliable, fast, and supports temperature
      temperature: 0.9,     // Add randomness
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
