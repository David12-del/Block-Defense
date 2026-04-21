export function createNetwork({ nickname, onInit, onSnapshot, onConnectionChange }) {
  const socket = io({
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    onConnectionChange(true);
    socket.emit("join", { nick: nickname });
  });

  socket.on("init", (payload) => {
    onInit(payload);
  });

  socket.on("snapshot", (snapshot) => {
    onSnapshot(snapshot);
  });

  socket.on("disconnect", () => {
    onConnectionChange(false);
  });

  return {
    sendInput(input) {
      socket.emit("input", input);
    },
    sendShoot(payload) {
      socket.emit("shoot", payload);
    }
  };
}
