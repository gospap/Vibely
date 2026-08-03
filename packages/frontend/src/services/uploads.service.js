import * as ImagePicker from "expo-image-picker";
import { http } from "./http";

// Photos travel to the API as base64 data URIs — see packages/backend/src/routes
// /uploads.js. Quality is capped because the body limit is 8MB.
const PICK_OPTIONS = {
  mediaTypes: ["images"],
  quality: 0.6,
  base64: true,
};

export const uploadsService = {
  // Opens the library, uploads what was picked, and resolves to a URL the API
  // can serve. Resolves to null if the user backs out.
  async pickAndUpload(folder = "chat", { allowsEditing = false } = {}) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Χρειάζεται πρόσβαση στις φωτογραφίες");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      ...PICK_OPTIONS,
      allowsEditing,
      aspect: allowsEditing ? [1, 1] : undefined,
    });

    if (result.canceled || !result.assets?.length) return null;

    const asset = result.assets[0];
    if (!asset.base64) throw new Error("Δεν ήταν δυνατή η ανάγνωση της εικόνας");

    const mime = asset.mimeType || "image/jpeg";
    const { url } = await http.post("/uploads", {
      folder,
      data: `data:${mime};base64,${asset.base64}`,
    });

    return url;
  },
};
