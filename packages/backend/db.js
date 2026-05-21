require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vibely";

let dbInstance = null;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    dbInstance = mongoose.connection.db;
    console.log("MongoDB connected");
    return dbInstance;
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
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
