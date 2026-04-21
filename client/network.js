export function createNetwork({ onInit, onSnapshot, onConnectionChange, onPong }) {
  const socket = io({
    transports: ["websocket"]
  });

  let pendingNickname = "";

  socket.on("connect", () => {
    onConnectionChange(true);

    if (pendingNickname) {
      socket.emit("join", { nick: pendingNickname });
    }
  });

  socket.on("init", (payload) => {
    onInit(payload);
  });

  socket.on("snapshot", (snapshot) => {
    onSnapshot(snapshot);
  });

  socket.on("pong-check", (payload) => {
    onPong(payload);
  });

  socket.on("disconnect", () => {
    onConnectionChange(false);
  });

  return {
    join(nickname) {
      pendingNickname = nickname;

      if (socket.connected) {
        socket.emit("join", { nick: nickname });
      }
    },
    sendInput(input) {
      socket.emit("input", input);
    },
    sendShoot(payload) {
      socket.emit("shoot", payload);
    },
    requestPing(clientTime) {
      socket.emit("ping-check", { clientTime });
    }
  };
}
