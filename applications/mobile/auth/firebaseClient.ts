import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { Platform } from "react-native";

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

let emulatorConnected = false;

export function connectAuthEmulatorIfEnabled() {

    if (emulatorConnected) return;

    const useEmulator =
        process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === "true";

    if (!useEmulator) return;

    // iOS simulator can use 127.0.0.1; Android emulator must use 10.0.2.2 to reach the host machine
    const host =
        Platform.OS === "android"
            ? "10.0.2.2"
            : (process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ??
              "127.0.0.1");
    const port = Number(
        process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT ?? "9099"
    );

    connectAuthEmulator(auth, `http://${host}:${port}`, {
        disableWarnings: true,
    });
    emulatorConnected = true;
}
