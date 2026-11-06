import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow } from "@/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export const Icon = ({ name, size = 20, color = C.text }: { name: IconName; size?: number; color?: string }) => (
  <Ionicons name={name} size={size} color={color} />
);

// ── text ──
export const H1 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[s.h1, style]}>{children}</Text>
);
export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[s.h2, style]}>{children}</Text>
);
export const Muted = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[s.muted, style]}>{children}</Text>
);

// ── layout ──
export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[s.card, style]}>{children}</View>
);

// ── buttons ──
type BtnKind = "primary" | "outline" | "ghost" | "danger";
export function Button({
  title,
  onPress,
  kind = "primary",
  icon,
  iconRight,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  kind?: BtnKind;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const fg = kind === "primary" ? C.white : kind === "danger" ? C.red : C.primary;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        kind === "primary" && s.btnPrimary,
        kind === "outline" && s.btnOutline,
        kind === "danger" && s.btnDanger,
        pressed && { opacity: 0.85 },
        off && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} />}
          <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
          {iconRight && <Ionicons name={iconRight} size={small ? 16 : 18} color={fg} />}
        </>
      )}
    </Pressable>
  );
}

export const IconButton = ({
  name,
  onPress,
  color = C.primary,
  bg = C.tint,
  label,
  size = 40,
}: {
  name: IconName;
  onPress?: () => void;
  color?: string;
  bg?: string;
  label: string;
  size?: number;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={6}
    style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}
  >
    <Ionicons name={name} size={size * 0.48} color={color} />
  </Pressable>
);

// ── small pieces ──
export const Pill = ({ text, color = C.primary, bg = C.tint }: { text: string; color?: string; bg?: string }) => (
  <View style={[s.pill, { backgroundColor: bg }]}>
    <Text style={[s.pillText, { color }]}>{text}</Text>
  </View>
);

export const Avatar = ({ text, size = 48 }: { text: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.tint2, alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: C.primaryDark, fontWeight: "800", fontSize: size * 0.36 }}>{text}</Text>
  </View>
);

export const ProgressBar = ({ value }: { value: number }) => (
  <View style={s.bar}>
    <View style={[s.barFill, { width: `${Math.max(4, Math.min(100, value * 100))}%` }]} />
  </View>
);

/** Icon + label + value row, as on the customer card. */
export const InfoRow = ({ icon, label, value, last }: { icon: IconName; label: string; value: string; last?: boolean }) => (
  <View style={[s.infoRow, !last && s.divider]}>
    <View style={s.infoIcon}>
      <Ionicons name={icon} size={18} color={C.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  </View>
);

/** Centered message for loading / errors / empty lists. */
export function Message({ icon = "information-circle-outline", title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={s.msg}>
      <Ionicons name={icon} size={36} color={C.faint} />
      <Text style={s.msgTitle}>{title}</Text>
      {text ? <Muted style={{ textAlign: "center" }}>{text}</Muted> : null}
      {action}
    </View>
  );
}

export const Loading = () => (
  <View style={s.msg}>
    <ActivityIndicator color={C.primary} size="large" />
  </View>
);

export const s = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.3 },
  h2: { fontSize: 17, fontWeight: "800", color: C.text },
  muted: { fontSize: 14, color: C.muted, lineHeight: 20 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.border, ...shadow },
  btn: { minHeight: 52, borderRadius: R.md, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  btnSmall: { minHeight: 40, paddingHorizontal: 14, borderRadius: R.sm },
  btnPrimary: { backgroundColor: C.primary },
  btnOutline: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.primary },
  btnDanger: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.red },
  btnText: { fontSize: 16, fontWeight: "700" },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, alignSelf: "flex-start" },
  pillText: { fontSize: 12, fontWeight: "700" },
  bar: { height: 8, borderRadius: 4, backgroundColor: C.tint, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, backgroundColor: C.primary },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
  infoIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 12, color: C.muted },
  infoValue: { fontSize: 15, color: C.text, fontWeight: "700", marginTop: 1 },
  msg: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  msgTitle: { fontSize: 17, fontWeight: "800", color: C.text, textAlign: "center" },
});
