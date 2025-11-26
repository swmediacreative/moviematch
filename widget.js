// public/widget.js
(function() {
  // Create a container element where chat will appear
  const container = document.getElementById('movie-match');
  if (!container) {
    console.error("Movie Match container not found. Add <div id='movie-match'></div> to your page.");
    return;
  }

  // Chat box structure
  container.innerHTML = `
    <div style="
      width:100%;
      max-width:400px;
      height:500px;
      background:#111;
      color:#fff;
      border-radius:10px;
      padding:10px;
      display:flex;
      flex-direction:column;
      font-family:sans-serif;
      box-shadow:0 4px 20px rgba(0,0,0,0.3);
    ">
      <div style="flex:1;overflow:auto;font-size:14px;" id="chat-log"></div>
      <input id="chat-input" placeholder="Type a message..." 
        style="width:100%;padding:8px;border:none;border-radius:8px;margin-top:6px;background:#222;color:#fff;">
    </div>
  `;

  const log = container.querySelector('#chat-log');
  const input = container.querySelector('#chat-input');

  async function sendMessage(text) {
    const userMsg = `<div style="margin:5px 0;"><b>You:</b> ${text}</div>`;
    log.innerHTML += userMsg;
    input.value = '';

    const response = await fetch('https://movie-match.vercel.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are Movie Match, a witty movie recommender bot." },
          { role: "user", content: text }
        ]
      })
    });

    const data = await response.json();
    log.innerHTML += `<div style="margin:5px 0;"><b>Movie Match:</b> ${data.reply}</div>`;
    log.scrollTop = log.scrollHeight;
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      sendMessage(input.value.trim());
    }
  });
})();
