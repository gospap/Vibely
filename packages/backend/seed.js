const mongoose = require("mongoose");
const { Event, Store } = require("./models");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gospap:gospap123@vibely.rwjz7jk.mongodb.net/vibely?retryWrites=true&w=majority&appName=Vibely";

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected");

    await Event.deleteMany();

    const stores = await Store.find();

    if (stores.length === 0) {
      throw new Error("No stores found. Seed stores first!");
    }

    const events = [
      {
        title: "Sunset Rooftop Sessions",
        description:
          "Golden hour DJ set with deep house, cocktails and Athens skyline views.",
        startDate: new Date("2026-06-12"),
        endDate: new Date("2026-06-12"),
        startHour: "19:00",
        endHour: "01:00",
        musicGenre: "Deep House",
        hostedBy: stores[0]._id, // Vibely Rooftop
        images: [
          "https://images.unsplash.com/photo-1505236858219-8359eb29e329",
        ],
      },

      {
        title: "Pulse Neon Rave Night",
        description:
          "High energy night with techno & EDM DJs, neon lights and late crowd vibes.",
        startDate: new Date("2026-06-14"),
        endDate: new Date("2026-06-15"),
        startHour: "22:30",
        endHour: "05:00",
        musicGenre: "Techno",
        hostedBy: stores[1]._id, // Pulse Bar
        images: ["https://images.unsplash.com/photo-1545128485-c400ce7b9d78"],
      },

      {
        title: "Neon Chill House Experience",
        description:
          "Smooth house beats, cocktails and relaxed neon lounge atmosphere.",
        startDate: new Date("2026-06-18"),
        endDate: new Date("2026-06-18"),
        startHour: "20:00",
        endHour: "02:00",
        musicGenre: "House",
        hostedBy: stores[2]._id, // Neon Lounge
        images: [
          "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b",
        ],
      },

      {
        title: "Studio 21 Live Sessions",
        description:
          "Indie bands, live performances and creative underground vibes.",
        startDate: new Date("2026-06-22"),
        endDate: new Date("2026-06-22"),
        startHour: "18:00",
        endHour: "00:00",
        musicGenre: "Live / Indie",
        hostedBy: stores[3]._id, // Studio 21
        images: [
          "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
        ],
      },

      {
        title: "Sunset Café Chill Beats",
        description:
          "Day-to-night transition with chill lo-fi, coffee vibes and sunset ambience.",
        startDate: new Date("2026-06-25"),
        endDate: new Date("2026-06-25"),
        startHour: "17:00",
        endHour: "23:00",
        musicGenre: "Lo-Fi / Chill",
        hostedBy: stores[4]._id, // Elysium Cafe
        images: [
          "https://images.unsplash.com/photo-1521017432531-fbd92d768814",
        ],
      },
    ];

    await Event.insertMany(events);

    console.log("🔥 Events seeded with stores!");

    process.exit();
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

seed();
