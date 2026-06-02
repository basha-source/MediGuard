import * as ImagePicker from "expo-image-picker";
import { doc, setDoc } from "firebase/firestore";
import { Alert } from "react-native";
import { getDb } from "@mediguard/firebase";
import { FIRESTORE } from "@mediguard/shared";

const PICKER_OPTS: ImagePicker.ImagePickerOptions = {
  mediaTypes: "images",
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.25,
  base64: true,
};

export async function pickAndUploadProfilePhoto(userId: string): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      "Profile Photo",
      "Choose a photo source",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert("Permission needed", "Camera access is required to take a photo.");
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchCameraAsync(PICKER_OPTS);
            if (result.canceled || !result.assets[0].base64) { resolve(null); return; }
            resolve(await _save(userId, result.assets[0].base64));
          },
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert("Permission needed", "Photo library access is required.");
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTS);
            if (result.canceled || !result.assets[0].base64) { resolve(null); return; }
            resolve(await _save(userId, result.assets[0].base64));
          },
        },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ],
    );
  });
}

async function _save(userId: string, base64: string): Promise<string | null> {
  try {
    const dataUri = `data:image/jpeg;base64,${base64}`;
    await setDoc(
      doc(getDb(), FIRESTORE.USERS, userId),
      { profilePhotoURL: dataUri },
      { merge: true },
    );
    return dataUri;
  } catch {
    Alert.alert("Save failed", "Could not save your photo. Please try again.");
    return null;
  }
}
