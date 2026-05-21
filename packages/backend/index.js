require("dotenv").config();

const express = require("express");
const { connectDB } = require("./db");
const { User } = require("./models");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");

const app = express();
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gospap:gospap123@vibely.rwjz7jk.mongodb.net/vibely?retryWrites=true&w=majority&appName=Vibely";

const store = MongoStore.create({
  mongoUrl: MONGODB_URI,
  collectionName: "session_store",
  mongoOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
});

store.on("error", function (error) {
  console.error("Session store error", error);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

connectDB().catch((err) => {
  console.error("MongoDB connection error", err);
  process.exit(1);
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

app.use("/auth", require("./src/routes/auth"));
app.use("/events", require("./src/routes/events"));
app.use("/", require("./src/routes/stores"));

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
