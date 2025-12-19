import { useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseClient";

export function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
  }, []);

  async function signInOrCreate(email: string, password: string) {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return res.user;
    } catch (e: any) {
      // If user doesn't exist, create it (nice for emulator dev)
      const res = await createUserWithEmailAndPassword(auth, email, password);
      return res.user;
    }
  }

  return { user, initializing, signInOrCreate };
}
