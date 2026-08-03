require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

let dbInstance = null;

const connectDB = async () => {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env and add your connection string.",
    );
  }

  await mongoose.connect(MONGODB_URI);
  dbInstance = mongoose.connection.db;
  console.log("MongoDB connected");
  return dbInstance;
};

const getDb = () => {
  if (!dbInstance) {
    throw new Error("MongoDB not connected");
  }
  return dbInstance;
};

module.exports = {
  connectDB,
  getDb,
};
