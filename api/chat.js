import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // ✅ Manually parse the body if undefined
  let body = req.body;
  if (!body) {
    try {
      const text = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => data += chunk);
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
      body = JSON.parse(text);
    } catch (err) {
      console.error("Body parse error:", err);
      return res.status(400).json({ reply: "Invalid request body" });
    }
  }

  const { messages } = body;

  try {
    // ✨ Add a randomizing phrase
    const randomPhrases = [
      "Let’s spin the cinematic wheel!",
      "Roll the director’s dice!",
      "Shuffle the film deck!",
      "Let fate pick a reel!",
    ];
    const phrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];

    const systemPrompt = `
${phrase}
You are Movie Match, a witty film expert who gives exactly one movie recommendation per chat,
introduced as "Here's today's Choice!". Each reply includes:
• a short, spoiler-free summary
• a reason to watch
• where it’s usually available to stream/rent
• and a fun trivia fact.
Keep it conversational and short.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      top_p: 1,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const reply = completion.choices[0].message.content;
    res.status(200).json({ reply });

  } catch (error) {
    console.error("Movie Match API Error:", error);
    res.status(500).json({
      reply: "🎞️ Oops! Something went wrong — try again in a moment.",
    });
  }
}
