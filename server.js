const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Статические файлы (фронтенд)
app.use(express.static(path.join(__dirname, 'public')));

// Запуск HTTP-сервера
const server = app.listen(PORT, () => {
  console.log(BubbleChat running on port ${PORT});
});

// WebSocket-сервер
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  ws.on('message', message => {
    // Рассылаем сообщение всем клиентам
    wss.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  });
});