import React from "react";
import { ScrollView, Text, View, StyleSheet, Platform } from "react-native";

type Props = { children: React.ReactNode };
type State = { error: string | null };

const g = globalThis as unknown as { __STARTUP_ERROR__?: string | null };

/**
 * Catches render/effect errors anywhere below it and renders the message on
 * screen instead of letting a release build crash to a black screen. Also
 * surfaces any error captured at startup by installErrorHandler / firebase / env.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    const detail =
      (error as { stack?: string; message?: string })?.stack ||
      (error as { message?: string })?.message ||
      String(error);
    return { error: detail };
  }

  render() {
    const err = this.state.error || g.__STARTUP_ERROR__ || null;
    if (err) {
      return (
        <View style={s.root}>
          <Text style={s.title}>⚠️ MediGuard failed to start</Text>
          <Text style={s.hint}>
            Share this screen with the developer. (This message only appears
            because something crashed at startup.)
          </Text>
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            <Text style={s.msg} selectable>
              {String(err)}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1B1B1B", paddingTop: Platform.OS === "ios" ? 60 : 40, paddingHorizontal: 18 },
  title: { color: "#FF6B6B", fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  hint: { color: "#BBBBBB", fontSize: 13, marginBottom: 16, lineHeight: 18 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  msg: { color: "#FFD7D7", fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", lineHeight: 18 },
});
