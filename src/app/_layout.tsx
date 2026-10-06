import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import {
  configureForegroundBackgroundFetch,
  registerHeadlessTask,
} from "@/features/background/headless-task";
import { ensureNotificationChannel } from "@/features/background/notifications";

// Android Headless JS requires this to run at import time, unconditionally.
registerHeadlessTask();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    configureForegroundBackgroundFetch();
    ensureNotificationChannel();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
