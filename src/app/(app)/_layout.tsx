import { Stack } from "expo-router";
import Logo from "@/components/Logo";
import { useJobPolling } from "@/lib/store";
import { C } from "@/theme";

export default function AppLayout() {
  // Keeps room scans and voice-note transcripts moving on every screen.
  useJobPolling();
  return (
    <Stack
      screenOptions={{
        headerTitle: () => <Logo />,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerTintColor: C.text,
        headerBackButtonDisplayMode: "minimal",
        headerStyle: { backgroundColor: C.white },
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="survey/[id]/record/[roomId]" options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }} />
      <Stack.Screen name="survey/[id]/item/[roomId]/[itemId]" options={{ presentation: "modal", headerTitle: "Edit item" }} />
      <Stack.Screen name="survey/[id]/add/[roomId]" options={{ presentation: "modal", headerTitle: "Add item" }} />
      <Stack.Screen name="survey/[id]/done" options={{ headerBackVisible: false, headerLeft: () => null, gestureEnabled: false }} />
    </Stack>
  );
}
