import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from "react-native";
import {
  collection, query, where, orderBy, limit,
  getDocs, updateDoc, doc, writeBatch,
} from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import type { Notification } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

function relativeTime(createdAt: string): string {
  const diff    = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);
  if (minutes < 1)   return "Just now";
  if (minutes < 60)  return `${minutes}m ago`;
  if (hours   < 24)  return `${hours}h ago`;
  if (days    === 1) return "Yesterday";
  return `${days}d ago`;
}

const TYPE_EMOJI: Record<string, string> = {
  dose:         "💊",
  expiry:       "⚠️",
  refill:       "📦",
  sos:          "🚨",
  careGuardian: "👤",
};

export function NotificationPrefsScreen() {
  const nav  = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const [items,      setItems]      = useState<Notification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = items.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const q    = query(
        collection(getDb(), FIRESTORE.NOTIFICATIONS),
        where("userId", "==", user.id),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)));
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications().finally(() => setLoading(false));
  }, [user, fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await updateDoc(doc(getDb(), FIRESTORE.NOTIFICATIONS, id), { read: true });
    } catch {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.read);
    if (!unread.length) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const batch = writeBatch(getDb());
      unread.forEach((n) =>
        batch.update(doc(getDb(), FIRESTORE.NOTIFICATIONS, n.id), { read: true })
      );
      await batch.commit();
    } catch {
      setItems((prev) =>
        prev.map((n) => {
          const wasUnread = unread.find((u) => u.id === n.id);
          return wasUnread ? { ...n, read: false } : n;
        })
      );
    }
  }, [items]);

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[s.item, !item.read && s.itemUnread]}
      onPress={() => { if (!item.read) markRead(item.id); }}
      activeOpacity={0.75}
    >
      <View style={s.dotCol}>
        {!item.read && <View style={s.dot} />}
      </View>
      <View style={s.iconCol}>
        <Text style={s.emoji}>{TYPE_EMOJI[item.type] ?? "🔔"}</Text>
      </View>
      <View style={s.textCol}>
        <Text style={[s.title, item.read && s.titleRead]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={s.body} numberOfLines={2}>{item.body}</Text>
        <Text style={s.time}>{relativeTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  function SettingsLink() {
    return (
      <TouchableOpacity
        style={s.settingsLink}
        onPress={() => nav.navigate("NotificationSettings" as any)}
        activeOpacity={0.75}
      >
        <View style={s.settingsIcon}>
          <Ionicons name="settings-outline" size={18} color={Colors.primary} />
        </View>
        <Text style={s.settingsLinkTxt}>Notification Settings</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={s.root}>
        <Header nav={nav} unreadCount={0} onMarkAll={markAllRead} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Header nav={nav} unreadCount={unreadCount} onMarkAll={markAllRead} />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? s.emptyContainer : s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="notifications-off-outline" size={56} color={Colors.textSecondary} />
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptySub}>
              Dose reminders, expiry alerts, and low stock warnings will appear here.
            </Text>
            <SettingsLink />
          </View>
        }
        ListFooterComponent={items.length > 0 ? <SettingsLink /> : null}
      />
    </View>
  );
}

function Header({
  nav,
  unreadCount,
  onMarkAll,
}: {
  nav: any;
  unreadCount: number;
  onMarkAll: () => void;
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
        <Ionicons name="arrow-back" size={22} color={Colors.white} />
      </TouchableOpacity>
      <View style={s.headerCenter}>
        <Text style={s.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{unreadCount} unread</Text>
          </View>
        )}
      </View>
      {unreadCount > 0 ? (
        <TouchableOpacity style={s.markAllBtn} onPress={onMarkAll}>
          <Text style={s.markAllTxt}>Mark all</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 62 }} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.bg },

  header:       { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 52, paddingBottom: 16 },
  backBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle:  { fontSize: 18, fontWeight: "700", color: Colors.white },
  badge:        { marginTop: 3, backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  badgeTxt:     { fontSize: 11, color: Colors.white, fontWeight: "600" },
  markAllBtn:   { paddingHorizontal: 8, paddingVertical: 4 },
  markAllTxt:   { fontSize: 12, color: Colors.white, fontWeight: "600", opacity: 0.9 },

  listContent:    { paddingBottom: 8 },
  emptyContainer: { flexGrow: 1 },

  item:         { flexDirection: "row", alignItems: "flex-start", backgroundColor: Colors.card, marginHorizontal: 14, marginVertical: 5, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  itemUnread:   { backgroundColor: "#F1F8F1", borderLeftWidth: 3, borderLeftColor: Colors.primary },
  dotCol:       { width: 10, alignItems: "center", paddingTop: 5 },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  iconCol:      { width: 34, alignItems: "center", paddingTop: 1 },
  emoji:        { fontSize: 22 },
  textCol:      { flex: 1, paddingLeft: 4 },
  title:        { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginBottom: 3 },
  titleRead:    { fontWeight: "400", color: Colors.textSecondary },
  body:         { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 5 },
  time:         { fontSize: 11, color: Colors.textSecondary, opacity: 0.7 },

  center:       { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle:   { fontSize: 17, fontWeight: "600", color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySub:     { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 24 },

  settingsLink:    { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, marginHorizontal: 14, marginTop: 8, marginBottom: 16, borderRadius: 14, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  settingsIcon:    { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primaryPale, alignItems: "center", justifyContent: "center" },
  settingsLinkTxt: { flex: 1, fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
});
