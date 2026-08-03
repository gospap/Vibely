require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const { connectDB } = require("./db");
const { User } = require("./models");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");

const { router: uploadsRouter, UPLOAD_ROOT } = require("./src/routes/uploads");

const app = express();

// Photos arrive as base64 data URIs, so the default 100kb body cap is too small.
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

const start = async () => {
  await connectDB();

  // Reuse the connection mongoose already opened instead of dialing a second one.
  const store = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: "session_store",
  });

  store.on("error", function (error) {
    console.error("Session store error", error);
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "supersecret",
      resave: false,
      saveUninitialized: false,
      store: store,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: false,
        httpOnly: true,
      },
    }),
  );

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use("/auth", require("./src/routes/auth"));
  app.use("/events", require("./src/routes/events"));
  app.use("/stores", require("./src/routes/stores"));
  app.use("/users", require("./src/routes/users"));
  app.use("/messages", require("./src/routes/messages"));
  app.use("/uploads", uploadsRouter);

  // Serve what the upload route just wrote.
  app.use("/uploads", express.static(UPLOAD_ROOT));

  app.get("/auth/me", async (req, res) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await User.findById(req.session.user.id).lean();
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      delete user.password;
      delete user.hashedpassword;
      delete user.__v;
      user.id = user._id.toString();

      return res.status(200).json({ user });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
};

start().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
