// server.js
// Run: npm install && npm start

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const HISTORY_FILE = path.join(__dirname, 'history.json');
const MAX_HISTORY = 500;

// load history if exists
let history = [];
try {
  if (fs.existsSync(HISTORY_FILE)) {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
    history = JSON.parse(raw) || [];
  }
} catch (e) {
  console.error('Failed to load history:', e);
  history = [];
}

// deterministic color from nick (HSL)
function colorFromNick(nick) {
  let h = 0;
  for (let i = 0; i < nick.length; i++) {
    h = (h * 31 + nick.charCodeAt(i)) | 0;
  }
  h = Math.abs(h) % 360;
  // saturation and lightness chosen for readable colors
  return hsl(${h},70%,55%);
}

function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(-MAX_HISTORY), null, 2));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

app.use(express.static(__dirname));

// WebSocket handling
wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.user = { nick: null, color: null };

  // send history to new client
  ws.send(JSON.stringify({ type: 'history', data: history }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.type === 'setNick') {
      const nick = String(msg.nick || '').trim().slice(0, 30);
      ws.user.nick = nick || ('Гость' + Math.floor(Math.random() * 1000));
      ws.user.color = colorFromNick(ws.user.nick);
      // optional: broadcast join
      // broadcast system join if wanted
      return;
    }

    if (msg.type === 'chat') {
      if (!ws.user.nick) {
        // ignore messages until nick set
        return;
      }
      const text = String(msg.text || '').slice(0, 2000);
      const item = {
        type: 'chat',
        nick: ws.user.nick,
        color: ws.user.color,
        text,
        ts: Date.now()
      };
      history.push(item);
      if (history.length > MAX_HISTORY) history.shift();
      saveHistory();

      // broadcast to all
      const payload = JSON.stringify(item);
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(payload);
        }
      });
    }
  });

  ws.on('close', () => {
    // nothing special on close for now
  });

  ws.on('error', () => {});
});

// simple heartbeat to clean dead clients
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.listen(PORT, () => {
  console.log(BubbleChat server started on port ${PORT});
});