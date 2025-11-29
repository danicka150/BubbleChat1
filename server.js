import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static("."));

io.on("connection", (socket) => {
  let username = null;

  socket.on("set name", (name) => {
    username = name;
    io.emit("chat message", { user: "SYSTEM", text: `${name} вошёл в чат` });
  });

  socket.on("chat message", (msg) => {
    if (!username) return;
    io.emit("chat message", { user: username, text: msg });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () =>
  console.log("Bubble Chat running on port " + PORT)
);
