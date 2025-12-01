const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

let messages = [];

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/messages", (req, res) => {
    res.json(messages);
});

app.post("/messages", (req, res) => {
    messages.push(req.body);
    if (messages.length > 200) messages.shift();
    res.json({ ok: true });
});

app.listen(3000, () => console.log("BubbleChat running at http://localhost:3000"));