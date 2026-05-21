import { Platform } from "react-native";

const LOCAL_IP = "192.168.1.68";

export const API_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : `http://${LOCAL_IP}:3000`;

export const API_BASE_URL = `${API_URL}/api`;
