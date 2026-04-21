import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import {
  addPlayerToGame,
  createGameState,
  createSnapshotForPlayer,
  handlePlayerInput,
  handlePlayerShoot,
  removePlayerFromGame,
  startGameLoop
} from "./game.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true
  }
});

const state = createGameState();
startGameLoop(io, state);

app.use("/client", express.static(path.join(rootDir, "client")));
app.use("/shared", express.static(path.join(rootDir, "shared")));
app.use("/public", express.static(path.join(rootDir, "public")));
app.use(express.static(path.join(rootDir, "public")));

app.get("/health", (_request, response) => {
  response.json({ ok: true, players: state.players.size });
});

app.get("/", (_request, response) => {
  response.sendFile(path.join(rootDir, "public", "index.html"));
});

io.on("connection", (socket) => {
  let joined = false;

  socket.on("join", ({ nick } = {}) => {
    if (joined) {
      return;
    }

    const player = addPlayerToGame(state, socket.id, nick);
    joined = true;

    socket.emit("init", {
      id: player.id,
      nick: player.nick,
      snapshot: createSnapshotForPlayer(state, socket.id)
    });
  });

  socket.on("input", (payload) => {
    if (!joined) {
      return;
    }

    handlePlayerInput(state, socket.id, payload);
  });

  socket.on("shoot", (payload) => {
    if (!joined) {
      return;
    }

    handlePlayerShoot(state, socket.id, payload);
  });

  socket.on("ping-check", ({ clientTime } = {}) => {
    socket.emit("pong-check", {
      clientTime: Number(clientTime) || 0,
      serverTime: Date.now()
    });
  });

  socket.on("disconnect", () => {
    if (!joined) {
      return;
    }

    removePlayerFromGame(state, socket.id);
  });
});

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

server.listen(port, host, () => {
  console.log(`Block Defense listening on http://${host}:${port}`);
});
