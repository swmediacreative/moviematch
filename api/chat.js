import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🎥 Helper function to get top 5 cast members from TMDB
async function getCastFromTMDB(movieTitle) {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`
    );
    const searchData = await searchRes.json();
    if (!searchData.results?.length) return null;

    const movieId = searchData.results[0].id;
    const creditsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`
    );
    const creditsData = await creditsRes.json();

    const castList = creditsData.cast?.slice(0, 5).map(a => a.name).join(", ");
    return castList || null;
  } catch (err) {
    console.error("TMDB cast fetch failed:", err);
    return null;
  }
}

export default async function handler(req, res) {
  // --- CORS headers ---
  res.setHeader("Access-Control-Allow-Origin", "https://talkmobility.co.uk");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request: messages missing" });
    }

    // 🧠 Movie Match system context
    const systemPrompt = `
You are Movie Match, a witty, spoiler-free film expert.
You always respond in HTML format like this:
<h2 class='movie-title'>Here's today's Choice!<br><span class='film-name'>[Movie]</span></h2>
<img src='[poster]' alt='[Movie] poster'>
<p><b>Summary</b> [summary]</p>
<p><b>Cast</b> [main actors]</p>
<p><b>Why Watch</b> [reason]</p>
<p><b>Where to Watch</b> [platform]</p>
<p><b>Trivia</b> [fun fact]</p>
Keep it concise, engaging, and spoiler-free.
`;

    // Ensure the first system message is our Movie Match personality
    const conversation = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    // --- Call OpenAI ---
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversation,
      temperature: 0.8,
      max_tokens: 400
    });

    let reply = completion.choices?.[0]?.message?.content?.trim() || "";

    // --- Extract movie title from reply ---
    const movieTitleMatch = reply.match(/<span[^>]*class=['"]film-name['"][^>]*>(.*?)<\/span>/i);
    const movieTitle = movieTitleMatch ? movieTitleMatch[1] : null;

    // --- Fetch cast from TMDB ---
    if (movieTitle) {
      const castList = await getCastFromTMDB(movieTitle);
      if (castList) {
        // Insert Cast section right after Summary if not already present
        if (!reply.includes("<b>Cast</b>")) {
          reply = reply.replace(
            /(<p><b>Summary<\/b>[^<]*<\/p>)/i,
            `$1<p><b>Cast</b> ${castList}</p>`
          );
        } else {
          // Replace if GPT provided an estimated cast
          reply = reply.replace(/<p><b>Cast<\/b>[^<]*<\/p>/i, `<p><b>Cast</b> ${castList}</p>`);
        }
      }
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Movie Match API error:", error);
    res.status(500).json({ error: "Server error while contacting OpenAI or TMDB." });
  }
}
