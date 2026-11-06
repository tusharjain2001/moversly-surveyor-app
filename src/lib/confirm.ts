import { Alert, Platform } from "react-native";

/** Yes / no question. Works on phones and in the web preview. */
export function confirm(title: string, message: string, ok = "OK", destructive = false): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: ok, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

/** A message with one OK button. */
export function notify(title: string, message: string) {
  if (Platform.OS === "web") globalThis.alert?.(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
