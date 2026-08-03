const express = require("express");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Base64 in, file on disk out. Keeps chat photos and avatars working without
// pulling in multer or an S3 bucket — swap this for real object storage before
// this ever runs anywhere but a dev machine.
const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");
const FOLDERS = new Set(["chat", "avatars", "stores"]);
const MAX_BYTES = 6 * 1024 * 1024;

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

router.post("/", requireAuth, async (req, res) => {
  try {
    const { data, folder = "chat" } = req.body;

    if (!data || typeof data !== "string") {
      return res.status(400).json({ message: "Missing image data" });
    }
    if (!FOLDERS.has(folder)) {
      return res.status(400).json({ message: "Unknown folder" });
    }

    const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(data);
    if (!match) {
      return res.status(400).json({ message: "Expected a base64 data URI" });
    }

    const [, mime, payload] = match;
    const extension = EXTENSIONS[mime.toLowerCase()];
    if (!extension) {
      return res.status(415).json({ message: "Unsupported image type" });
    }

    const buffer = Buffer.from(payload, "base64");
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ message: "Image is larger than 6MB" });
    }

    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${extension}`;
    const directory = path.join(UPLOAD_ROOT, folder);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), buffer);

    // Absolute URL so the phone can load it straight off the dev machine.
    const base = `${req.protocol}://${req.get("host")}`;
    res.status(201).json({ url: `${base}/uploads/${folder}/${filename}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = { router, UPLOAD_ROOT };
