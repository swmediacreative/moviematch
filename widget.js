// public/widget.js
(function() {
  const chatBtn = document.createElement('div');
  chatBtn.id = 'movie-match-bubble';
  chatBtn.innerText = '🎬 Chat';
  Object.assign(chatBtn.style, {
    position: 'fixed', bottom: '20px', right: '20px',
    background: '#222', color: '#fff', padding: '12px 16px',
    borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold',
    zIndex: 9999, boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
  });
  document.body.appendChild(chatBtn);

  const chatBox = document.createElement('div');
  Object.assign(chatBox.style, {
    position: 'fixed', bottom: '80px', right: '20px',
    width: '320px', height: '420px', background: '#111',
    color: '#fff', borderRadius: '10px', padding: '10px',
    display: 'none', flexDirection: 'column', zIndex: 9999
  });
  chatBox.innerHTML = `
    <div style="flex:1;overflow:auto;font-family:sans-serif;font-size:14px;" id="chat-log"></div>
    <input id="chat-input" placeholder="Type a message..." style="width:100%;padding:8px;border:none;border-radius:8px;margin-top:6px;">
  `;
  document.body.appendChild(chatBox);

  chatBtn.onclick = () => {
    chatBox.style.display = chatBox.style.display === 'none' ? 'flex' : 'none';
  };

  const log = document.getElementById('chat-log');
  const input = document.getElementById('chat-input');

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
