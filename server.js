const express = require("express");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

let history = [];

// Загружаем историю
const historyFile = path.join(__dirname, "history.json");
if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
}

// Автосохранение
function saveHistory() {
    fs.writeFileSync(historyFile, JSON.stringify(history.slice(-200), null, 2));
}

app.use(express.static(__dirname));

const server = app.listen(PORT, () => {
    console.log("BubbleChat running on " + PORT);
});

const wss = new WebSocket.Server({ server });

function randomColor() {
    const colors = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];
    return colors[Math.floor(Math.random() * colors.length)];
}

wss.on("connection", ws => {
    ws.user = { nick: null, color: randomColor() };

    // Отдаём историю
    ws.send(JSON.stringify({ type: "history", history }));

    ws.on("message", msg => {
        msg = JSON.parse(msg);

        // Установка ника
        if (msg.type === "setNick") {
            ws.user.nick = msg.nick;
            return;
        }

        // Новое сообщение
        if (msg.type === "chat") {
            const message = {
                nick: ws.user.nick,
                color: ws.user.color,
                text: msg.text,
                time: Date.now()
            };

            history.push(message);
            saveHistory();

            [...wss.clients].forEach(c =>
                c.send(JSON.stringify({ type: "chat", message }))
            );
        }
    });
});