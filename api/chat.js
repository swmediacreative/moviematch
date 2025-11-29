// pages/api/chat.js
import fetch from "node-fetch";

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// ✅ TMDB official genre IDs
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
  Thriller: 53,
  War: 10752,
  Western: 37,
};

export default async function handler(req, res) {
  // 🧩 CORS setup so widget can call this endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ✅ Safely parse JSON body (works on Edge + Node runtimes)
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { messages } = body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        reply: `<p>⚠️ Missing or invalid 'messages' in request body.</p>`,
      });
    }

    const userMessage = messages[messages.length - 1].content;

    // 🎯 Detect genre from user text
    const matchedGenreKey = Object.keys(GENRE_IDS).find((g) =>
      userMessage.toLowerCase().includes(g.toLowerCase())
    );

    let genreId = matchedGenreKey ? GENRE_IDS[matchedGenreKey] : null;

    // If no genre matched, pick a random one
    if (!genreId) {
      const genreKeys = Object.keys(GENRE_IDS);
      const randomKey = genreKeys[Math.floor(Math.random() * genreKeys.length)];
      genreId = GENRE_IDS[randomKey];
    }

    // 🎬 Fetch a random page of results from TMDB Discover
    const page = Math.floor(Math.random() * 5) + 1;
    const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${genreId}&include_adult=false&page=${page}`;

    const discoverRes = await fetch(discoverUrl);
    const discoverData = await discoverRes.json();

    if (!discoverData.results?.length) {
      return res.json({
        reply: `<p>Couldn't find any films in that genre. Try another one!</p>`,
      });
    }

    // 🎞️ Pick a random movie
    const movie =
      discoverData.results[
        Math.floor(Math.random() * discoverData.results.length)
      ];

    // 🖼️ Add poster image if available
    const poster = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null;

    // 🧠 Fetch detailed info (tagline, release date, etc.)
    const detailsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=en-US`
    );
    const details = await detailsRes.json();

    // ✍️ Compose text fields
    const genreName = matchedGenreKey || "movie";
    const title = movie.title || movie.name || "Untitled";
    const summary = movie.overview || "No summary available.";
    const tagline =
      details.tagline ||
      `A must-watch ${genreName.toLowerCase()} that fans still talk about.`;
    const trivia = `Released in ${
      movie.release_date?.split("-")[0] || "unknown year"
    } • Rated ${movie.vote_average}/10 on TMDB.`;

    // 🧩 Build the chatbot-friendly HTML
    const reply = `
      <h2 class='movie-title'>Here's today's Choice!<br>
      <span class='film-name'>${title}</span></h2>
      ${
        poster
          ? `<img src="${poster}" alt="${title} poster" style="max-width:100%;border-radius:10px;margin-bottom:10px;">`
          : ""
      }
      <p><b>Summary</b> ${summary}</p>
      <p><b>Why Watch</b> ${tagline}</p>
      <p><b>Where to Watch</b> You can usually find this on major streaming platforms.</p>
      <p><b>Trivia</b> ${trivia}</p>
    `;

    // ✅ Return the reply to the frontend widget
    res.status(200).json({ reply });
  } catch (err) {
    console.error("TMDB API Error:", err);
    res.status(500).json({
      reply: `<p>⚠️ Oops! ${err.message || "Something went wrong."}</p>`,
    });
  }
}
