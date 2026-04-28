import { getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "./config";

export const getDb = () => getFirestore(getFirebaseApp());
