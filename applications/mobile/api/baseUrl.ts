import { Platform } from "react-native";

export function getApiBaseUrl() {
  if (__DEV__) {
    // Android emulator uses 10.0.2.2 to reach host machine
    if (Platform.OS === "android") return "http://10.0.2.2:3001";
    return "http://127.0.0.1:3001";
  }
  // Todo: prod uri
  return "https://api.yourdomain.com";
}
