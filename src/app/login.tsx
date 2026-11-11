import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { USE_MOCK } from "@/api/config";
import Logo from "@/components/Logo";
import { Button, Icon, Muted } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { C, R } from "@/theme";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 36 }}>
            <Logo size={26} />
            <Text style={st.title}>Surveyor login</Text>
            <Muted style={{ textAlign: "center" }}>Sign in to see your customers.</Muted>
          </View>

          <Text style={st.label}>Email</Text>
          <TextInput
            style={st.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@moversly.com"
            placeholderTextColor={C.faint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
          />

          <Text style={[st.label, { marginTop: 16 }]}>Password</Text>
          <View style={st.passRow}>
            <TextInput
              style={[st.input, { flex: 1, borderWidth: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={C.faint}
              secureTextEntry={!show}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} accessibilityLabel={show ? "Hide password" : "Show password"} style={{ paddingHorizontal: 14 }}>
              <Icon name={show ? "eye-off-outline" : "eye-outline"} color={C.muted} />
            </Pressable>
          </View>

          {error ? <Text style={st.error}>{error}</Text> : null}

          <Button title="Log in" onPress={submit} loading={busy} style={{ marginTop: 24 }} />

          {USE_MOCK && (
            <View style={st.demo}>
              <Icon name="flask-outline" size={18} color={C.amber} />
              <Text style={st.demoText}>Demo mode: sample customers. Any email and password works.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: "center", padding: 24, maxWidth: 480, width: "100%", alignSelf: "center" },
  title: { fontSize: 24, fontWeight: "800", color: C.text, marginTop: 24, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 6 },
  input: { minHeight: 52, borderWidth: 1.5, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, fontSize: 16, color: C.text, backgroundColor: C.white },
  passRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: R.md, backgroundColor: C.white },
  error: { color: C.red, marginTop: 14, fontSize: 14 },
  demo: { flexDirection: "row", gap: 8, marginTop: 24, padding: 12, borderRadius: R.md, backgroundColor: C.amberTint },
  demoText: { flex: 1, color: C.amber, fontSize: 13, lineHeight: 18 },
});
