// Direct Firebase service accessors for the web app.
// Avoids the @mediguard/firebase package which may resolve firebase/app
// from a different module instance, causing "Component not registered" errors.
import { getAuth }      from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage }   from "firebase/storage";

// These are called after firebase.ts has run initializeApp(), so getAuth()
// / getFirestore() / getStorage() with no args use the default app.
export const auth    = () => getAuth();
export const db      = () => getFirestore();
export const storage = () => getStorage();
