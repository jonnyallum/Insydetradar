import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppProvider } from "@/lib/store";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import * as Notifications from 'expo-notifications';
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import * as Auth from "@/lib/_core/auth";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

// Notification Manager Component
function NotificationManager() {
  const { state } = useApp();
  const updateToken = trpc.auth.updatePushToken.useMutation();

  useEffect(() => {
    if (state.isAuthenticated) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          updateToken.mutate({ token });
        }
      });

      // Listen for incoming notifications
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      return () => {
        subscription.remove();
      };
    }
  }, [state.isAuthenticated]);

  return null;
}

// Auth State Synchronization Component
function AuthSyncManager() {
  const { dispatch } = useApp();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleAuthEvent('SIGNED_IN', session);
      }
    });

    const handleAuthEvent = async (event: string, session: any) => {
      console.log(`[AuthSync] Tactical Event: ${event}`);

      if (session?.access_token) {
        await Auth.setSessionToken(session.access_token);

        if (session.user) {
          dispatch({
            type: 'LOGIN',
            payload: {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Operative'
            }
          });
        }
      } else if (event === 'SIGNED_OUT') {
        await Auth.removeSessionToken();
        dispatch({ type: 'LOGOUT' });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthEvent(event, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return null;
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <NotificationManager />
            <AuthSyncManager />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" options={{ presentation: "fullScreenModal" }} />
              <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal" }} />
              <Stack.Screen name="oauth/callback" />
            </Stack>
            <StatusBar style="light" />
          </QueryClientProvider>
        </trpc.Provider>
      </AppProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
