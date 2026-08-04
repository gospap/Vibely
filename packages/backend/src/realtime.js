const { Server } = require("socket.io");

let io = null;

// Each user gets a room named after their id. Emitting to a *user* rather than
// to a socket means a second device, or a reconnect that lands mid-message,
// still receives it.
const room = (userId) => `user:${userId}`;

function initRealtime(server, sessionMiddleware) {
  io = new Server(server, {
    cors: { origin: true, credentials: true },
    // Phones switch between WiFi and mobile data constantly; a short ping
    // timeout just churns connections.
    pingTimeout: 25000,
  });

  // Reuse the express session rather than inventing a second auth scheme —
  // engine.use runs the middleware over the handshake request, so the cookie
  // the app already sends with every fetch identifies the socket too.
  io.engine.use(sessionMiddleware);

  io.use((socket, next) => {
    const id = socket.request.session?.user?.id;
    if (!id) return next(new Error("unauthorized"));

    socket.userId = id;
    next();
  });

  io.on("connection", (socket) => {
    socket.join(room(socket.userId));

    // Relayed, never stored. A typing bubble that survives a reload is worse
    // than no typing bubble at all.
    socket.on("typing", ({ to, typing } = {}) => {
      if (!to) return;
      io.to(room(to)).emit("typing", {
        from: socket.userId,
        typing: !!typing,
      });
    });
  });

  return io;
}

// A no-op before init, so route handlers never have to check whether realtime
// is up. Messages are still written by the HTTP route either way — this only
// pushes what was already saved.
function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(room(userId.toString())).emit(event, payload);
}

module.exports = { initRealtime, emitToUser };
