import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseApp } from "./config";

export const getFirebaseAuth = () => getAuth(getFirebaseApp());

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(getFirebaseAuth(), email, password);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(getFirebaseAuth(), email, password);

export const signOutUser = () => signOut(getFirebaseAuth());
