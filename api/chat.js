import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🧠 Simple in-memory cache for recently picked movies
const recentMovies = new Set();
const MAX_RECENT = 10; // Remember last 10 movies (adjust as you like)

// 🧩 Helper: fetch cast + poster from TMDB
async function getTMDBInfo(movieTitle) {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`
    );
    const searchData = await searchRes.json();
    if (!searchData.results?.length) return {};

    const movie = searchData.results[0];
    const movieId = movie.id;
    const posterPath = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null;

    const creditsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`
    );
    const creditsData = await creditsRes.json();
    const castList = creditsData.cast?.slice(0, 5).map(a => a.name).join(", ");

    return { castList, posterPath };
  } catch (err) {
    console.error("TMDB fetch failed:", err);
    return {};
  }
}

export default async function handler(req, res) {
  // --- CORS setup ---
  res.setHeader("Access-Control-Allow-Origin", "https://moviematch.uk");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request: messages missing" });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // --- Detect genre keywords ---
    const genreKeywords = [
      "action","adventure","animation","biography","comedy","crime","documentary",
      "drama","family","fantasy","historical","horror","musical","mystery",
      "romance","sci-fi","science fiction","sports","thriller","war","western"
    ];
    const matchedGenre = genreKeywords.find(g =>
      lastUserMessage.toLowerCase().includes(g)
    );

    // --- TMDb genre ID map ---
    const genreMap = {
      action: 28, adventure: 12, animation: 16, biography: 36, comedy: 35,
      crime: 80, documentary: 99, drama: 18, family: 10751, fantasy: 14,
      historical: 36, horror: 27, musical: 10402, mystery: 9648,
      romance: 10749, "sci-fi": 878, "science fiction": 878,
      sports: 10770, thriller: 53, war: 10752, western: 37
    };

    // --- Pre-fetch random TMDb movie using year+page combo ---
    let tmdbMovie = null;
    if (matchedGenre) {
      const TMDB_API_KEY = process.env.TMDB_API_KEY;

      // 🎲 Randomize year & page for wide coverage
      const randomYear = Math.floor(Math.random() * 56) + 1970; // 1970–2025
      const randomPage = Math.floor(Math.random() * 500) + 1;   // 1–500
      const genreId = genreMap[matchedGenre];
      const sortMode = Math.random() > 0.5 ? "popularity.desc" : "vote_average.desc";

      const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&include_adult=false&sort_by=${sortMode}&vote_count.gte=50&primary_release_year=${randomYear}&page=${randomPage}${genreId ? `&with_genres=${genreId}` : ""}`;

      console.log("🎬 TMDb Discover URL:", discoverUrl);

      const discoverRes = await fetch(discoverUrl);
      const discoverData = await discoverRes.json();

      if (discoverData.results?.length) {
        // Filter out recently shown movies
        const freshResults = discoverData.results.filter(
          m => !recentMovies.has(m.id)
        );

        // Fallback if everything’s already seen
        const selectionPool = freshResults.length
          ? freshResults
          : discoverData.results;

        tmdbMovie = selectionPool[
          Math.floor(Math.random() * selectionPool.length)
        ];

        // Record the chosen movie ID in memory
        if (tmdbMovie?.id) {
          recentMovies.add(tmdbMovie.id);
          // Keep cache limited
          if (recentMovies.size > MAX_RECENT) {
            const first = [...recentMovies][0];
            recentMovies.delete(first);
          }
        }
      }
    }

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
Keep it concise, witty, and spoiler-free.
`;

    // --- Prepare GPT conversation ---
    let conversation;
    if (tmdbMovie) {
      conversation = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Use this TMDb movie data to write your witty recommendation in HTML:\n${JSON.stringify(
            tmdbMovie
          )}`
        }
      ];
    } else {
      conversation = [{ role: "system", content: systemPrompt }, ...messages];
    }

    // --- Call GPT ---
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversation,
      temperature: 0.8,
      max_tokens: 400
    });

    let reply = completion.choices?.[0]?.message?.content?.trim() || "";

    // --- Extract movie title and existing poster
    const titleMatch = reply.match(/<span[^>]*film-name[^>]*>(.*?)<\/span>/i);
    const movieTitle = titleMatch ? titleMatch[1] : null;
    const existingPoster = (reply.match(/<img[^>]*src=['"](.*?)['"]/i) || [])[1];

    // --- Enrich with TMDb poster and cast ---
    if (movieTitle) {
      const { castList, posterPath } = await getTMDBInfo(movieTitle);

      if (castList) {
        if (!reply.includes("<b>Cast</b>")) {
          reply = reply.replace(
            /(<p><b>Summary<\/b>[^<]*<\/p>)/i,
            `$1<p><b>Cast</b> ${castList}</p>`
          );
        } else {
          reply = reply.replace(
            /<p><b>Cast<\/b>[^<]*<\/p>/i,
            `<p><b>Cast</b> ${castList}</p>`
          );
        }
      }

      if (posterPath) {
        if (existingPoster) {
          reply = reply.replace(
            /<img[^>]*src=['"][^'"]+['"][^>]*>/i,
            `<img src='${posterPath}' alt='${movieTitle} poster'>`
          );
        } else {
          reply = reply.replace(
            /(<h2[^>]*>[\s\S]*?<\/h2>)/i,
            `$1\n<img src='${posterPath}' alt='${movieTitle} poster'>`
          );
        }
      }
    }

    // --- TMDb attribution ---
    reply +=
      "<p style='font-size:12px;opacity:0.6;'>Movie data provided by <a href='https://www.themoviedb.org/' target='_blank' style='color:#00b2b2;'>TMDb</a>.</p>";

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Movie Match API error:", error);
    res
      .status(500)
      .json({ error: "Server error while contacting OpenAI or TMDb." });
  }
}
