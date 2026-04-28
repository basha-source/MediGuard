import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function scheduleDoseReminder(medicineName: string, scheduledTime: Date) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💊 Dose Reminder",
      body:  `Time to take ${medicineName}`,
      sound: true,
    },
    trigger: scheduledTime,
  });
}

export async function scheduleExpiryAlert(medicineName: string, daysLeft: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚠️ Expiry Alert",
      body:  `${medicineName} expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
      sound: true,
    },
    trigger: { seconds: 60 },
  });
}
