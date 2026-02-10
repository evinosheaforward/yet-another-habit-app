// auth/firebase.ts
import admin from "firebase-admin";
import { env } from "../config/env";

export function initFirebaseAdmin() {
  if (admin.apps.length) return;

  // 🔑 Emulator toggle
  if (env.firebase.useEmulator) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = env.firebase.authEmulatorHost;

    // Helpful logging
    console.log(
      `Using Firebase Auth Emulator at ${env.firebase.authEmulatorHost}`
    );
  } else {
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    console.log("Using Firebase Auth");
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: env.firebase.projectId,
  });
}

export function verifyIdToken(token: string) {
  return admin.auth().verifyIdToken(token);
}

export function deleteFirebaseUser(uid: string) {
  return admin.auth().deleteUser(uid);
}
