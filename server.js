const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, "data.json");

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return { users: {}, roulette: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ===== РЕГИСТРАЦИЯ ===== */
app.post("/api/signup", (req, res) => {
  const { nick, password, avatar } = req.body;
  const data = readData();

  if (!nick || !password) return res.json({ error: "Заполни все поля" });
  if (data.users[nick]) return res.json({ error: "Ник занят" });

  data.users[nick] = {
    password,
    avatar: avatar || "",
    status: "offline",
    friends: [],
    blocked: [],
    chats: {}
  };

  writeData(data);
  res.json({ ok: true });
});

/* ===== ВХОД ===== */
app.post("/api/login", (req, res) => {
  const { nick, password } = req.body;
  const data = readData();

  const user = data.users[nick];
  if (!user || user.password !== password)
    return res.json({ error: "Неверные данные" });

  user.status = "online";
  writeData(data);

  res.json({
    ok: true,
    user: {
      nick,
      avatar: user.avatar,
      status: user.status,
      friends: user.friends,
      blocked: user.blocked,
      chats: user.chats
    }
  });
});

/* ===== ВЫХОД ===== */
app.post("/api/logout", (req, res) => {
  const { nick } = req.body;
  const data = readData();
  if (data.users[nick]) {
    data.users[nick].status = "offline";
    writeData(data);
  }
  res.json({ ok: true });
});

/* ===== ВСЕ ПОЛЬЗОВАТЕЛИ ===== */
app.get("/api/users", (req, res) => {
  const data = readData();
  const users = Object.keys(data.users).map(n => ({
    nick: n,
    avatar: data.users[n].avatar,
    status: data.users[n].status
  }));
  res.json(users);
});

/* ===== ДОБАВИТЬ В ДРУЗЬЯ ===== */
app.post("/api/add-friend", (req, res) => {
  const { me, friend } = req.body;
  const data = readData();

  if (!data.users[me] || !data.users[friend])
    return res.json({ error: "Пользователь не найден" });

  if (data.users[friend].blocked.includes(me))
    return res.json({ error: "Ты заблокирован" });

  if (!data.users[me].friends.includes(friend)) {
    data.users[me].friends.push(friend);
    data.users[friend].friends.push(me);

    data.users[me].chats[friend] = [];
    data.users[friend].chats[me] = [];
  }

  writeData(data);
  res.json({ ok: true });
});

/* ===== УДАЛИТЬ ИЗ ДРУЗЕЙ ===== */
app.post("/api/remove-friend", (req, res) => {
  const { me, friend } = req.body;
  const data = readData();

  if (!data.users[me] || !data.users[friend])
    return res.json({ error: "Пользователь не найден" });

  data.users[me].friends = data.users[me].friends.filter(f => f !== friend);
  data.users[friend].friends = data.users[friend].friends.filter(f => f !== me);

  delete data.users[me].chats[friend];
  delete data.users[friend].chats[me];

  writeData(data);
  res.json({ ok: true });
});

/* ===== БЛОКИРОВКА ===== */
app.post("/api/block", (req, res) => {
  const { me, target } = req.body;
  const data = readData();

  if (!data.users[me] || !data.users[target])
    return res.json({ error: "Пользователь не найден" });

  if (!data.users[me].blocked.includes(target))
    data.users[me].blocked.push(target);

  data.users[me].friends = data.users[me].friends.filter(f => f !== target);
  data.users[target].friends = data.users[target].friends.filter(f => f !== me);

  writeData(data);
  res.json({ ok: true });
});

/* ===== РАЗБЛОКИРОВКА ===== */
app.post("/api/unblock", (req, res) => {
  const { me, target } = req.body;
  const data = readData();

  data.users[me].blocked = data.users[me].blocked.filter(b => b !== target);

  writeData(data);
  res.json({ ok: true });
});

/* ===== СООБЩЕНИЕ ===== */
app.post("/api/send", (req, res) => {
  const { from, to, text } = req.body;
  const data = readData();
if (data.users[to].blocked.includes(from))
    return res.json({ error: "Ты заблокирован" });

  const msg = { from, text, time: Date.now() };

  data.users[from].chats[to].push(msg);
  data.users[to].chats[from].push(msg);

  writeData(data);
  res.json({ ok: true });
});

/* ===== ИСТОРИЯ СООБЩЕНИЙ ===== */
app.get("/api/chat-history", (req, res) => {
  const { me, friend } = req.query;
  const data = readData();

  if (!data.users[me] || !data.users[friend])
    return res.json({ error: "Пользователь не найден" });

  res.json(data.users[me].chats[friend] || []);
});

/* ===== ОБНОВЛЕНИЕ ПРОФИЛЯ ===== */
app.post("/api/update-profile", (req, res) => {
  const { me, avatar, password } = req.body;
  const data = readData();

  if (!data.users[me]) return res.json({ error: "Пользователь не найден" });

  if (avatar !== undefined) data.users[me].avatar = avatar;
  if (password) data.users[me].password = password;

  writeData(data);
  res.json({ ok: true });
});

/* ===== ЧАТ-РУЛЕТКА ===== */
app.post("/api/roulette/join", (req, res) => {
  const { nick } = req.body;
  const data = readData();

  if (!data.roulette.includes(nick)) data.roulette.push(nick);

  if (data.roulette.length >= 2) {
    const a = data.roulette.shift();
    const b = data.roulette.shift();

    if (
      data.users[a].blocked.includes(b) ||
      data.users[b].blocked.includes(a)
    ) {
      return res.json({ wait: true });
    }

    writeData(data);
    return res.json({ match: [a, b] });
  }

  writeData(data);
  res.json({ wait: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("BubbleChat запущен на порту " + PORT));
