import { getAuth } from "firebase/auth";
import { getFirebaseApp } from "./config";

export const getFirebaseAuth = () => getAuth(getFirebaseApp());
