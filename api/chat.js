// pages/api/chat.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const { messages } = await req.body;
  const userMessage = messages[messages.length - 1].content;
  const genreMatch = userMessage.match(/recommend (?:a )?([\w\s-]+) movie/i);
  const genreQuery = genreMatch ? genreMatch[1] : "popular";

  try {
    // === TMDB SEARCH ===
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(
        genreQuery
      )}&include_adult=false&language=en-US&page=1`
    );
    const tmdbData = await tmdbRes.json();

    if (!tmdbData.results?.length) {
      return res.json({ reply: `<p>No results found for "${genreQuery}". Try another genre!</p>` });
    }

    const movie = tmdbData.results[Math.floor(Math.random() * tmdbData.results.length)];
    const movieDetails = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${process.env.TMDB_API_KEY}&language=en-US`
    ).then(r => r.json());

    // === FORMAT REPLY ===
    const reply = `
      <h2 class='movie-title'>Here's today's Choice!<br><span class='film-name'>${movie.title}</span></h2>
      <p><b>Summary</b> ${movie.overview || "No synopsis available."}</p>
      <p><b>Why Watch</b> ${movieDetails.tagline || "It’s a fan favorite!"}</p>
      <p><b>Where to Watch</b> Check your favorite streaming service or rent online.</p>
      <p><b>Trivia</b> Released in ${movie.release_date?.split("-")[0]}, rated ${movie.vote_average}/10 on TMDB.</p>
    `;

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: `⚠️ Error: ${err.message}` });
  }
}
