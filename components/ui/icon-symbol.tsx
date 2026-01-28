// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "chart.line.uptrend.xyaxis": "show-chart",
  "bolt.fill": "bolt",
  "wallet.pass.fill": "account-balance-wallet",
  "person.fill": "person",
  // Actions
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "xmark": "close",
  "plus": "add",
  "minus": "remove",
  // Trading
  "arrow.up.right": "trending-up",
  "arrow.down.right": "trending-down",
  "arrow.triangle.2.circlepath": "sync",
  "clock.fill": "schedule",
  "bell.fill": "notifications",
  "gearshape.fill": "settings",
  "power": "power-settings-new",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "stop.fill": "stop",
  // Status
  "checkmark.circle.fill": "check-circle",
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  // Finance
  "creditcard.fill": "credit-card",
  "banknote.fill": "payments",
  "arrow.up.circle.fill": "arrow-upward",
  "arrow.down.circle.fill": "arrow-downward",
  // Markets
  "bitcoinsign.circle.fill": "currency-bitcoin",
  "chart.bar.fill": "bar-chart",
  "globe": "public",
  // Auth
  "envelope.fill": "email",
  "lock.fill": "lock",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "faceid": "face",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
