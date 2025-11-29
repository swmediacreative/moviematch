// pages/api/chat.js
import fetch from "node-fetch";

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// ✅ Genre mapping (TMDB official IDs)
const GENRE_IDS = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  "Sci-Fi": 878, // alias
  TVMovie: 10770,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

export default async function handler(req, res) {
  try {
    const { messages } = await req.body;
    const userMessage = messages[messages.length - 1].content;

    // 🎯 Detect genre from user text
    const matchedGenreKey = Object.keys(GENRE_IDS).find((g) =>
      userMessage.toLowerCase().includes(g.toLowerCase())
    );

    let genreId = matchedGenreKey ? GENRE_IDS[matchedGenreKey] : null;

    // If no explicit genre found, pick random
    if (!genreId) {
      const genreKeys = Object.keys(GENRE_IDS);
      const randomKey = genreKeys[Math.floor(Math.random() * genreKeys.length)];
      genreId = GENRE_IDS[randomKey];
    }

    // 🎬 Fetch random movie from TMDB Discover
    const page = Math.floor(Math.random() * 5) + 1; // randomize between first 5 pages
    const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${genreId}&include_adult=false&page=${page}`;

    const discoverRes = await fetch(discoverUrl);
    const discoverData = await discoverRes.json();

    if (!discoverData.results?.length) {
      return res.json({
        reply: `<p>Couldn't find any films in that genre. Try another one!</p>`,
      });
    }

    const movie =
      discoverData.results[
        Math.floor(Math.random() * discoverData.results.length)
      ];

    // 🧠 Get full details for richer info
    const detailsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=en-US`
    );
    const details = await detailsRes.json();

    // ✍️ Build witty reply
    const tagline =
      details.tagline ||
      `A ${matchedGenreKey || "film"} that movie lovers keep talking about.`;
    const summary = movie.overview || "No summary available.";
    const trivia = `Released in ${
      movie.release_date?.split("-")[0] || "unknown year"
    } • Rated ${movie.vote_average}/10 by TMDB users.`;

    // 🧩 HTML structure for your chatbot display
    const reply = `
      <h2 class='movie-title'>Here's today's Choice!<br>
      <span class='film-name'>${movie.title}</span></h2>
      <p><b>Summary</b> ${summary}</p>
      <p><b>Why Watch</b> ${tagline}</p>
      <p><b>Where to Watch</b> You can usually find this on major streaming platforms.</p>
      <p><b>Trivia</b> ${trivia}</p>
    `;

    res.status(200).json({ reply });
  } catch (err) {
    console.error("TMDB API Error:", err);
    res
      .status(500)
      .json({ reply: `<p>⚠️ Oops! ${err.message || "Something went wrong."}</p>` });
  }
}
