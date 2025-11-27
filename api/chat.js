import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { messages } = req.body;

    // ✨ Add a random phrase for variation each time
    const randomPhrases = [
      "Let’s spin the cinematic wheel!",
      "Roll the director’s dice!",
      "Shuffle the film deck!",
      "Let fate pick a reel!",
    ];
    const phrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];

    // 🎞️ Add this to the system prompt so every chat is unique
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
      model: "gpt-4o-mini",   // or "gpt-4o-mini" if using a smaller model
      temperature: 0.9,  // 🔥 makes results more random
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
