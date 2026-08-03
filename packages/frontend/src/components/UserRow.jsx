import { View, Text, Pressable, StyleSheet } from "react-native";
import Avatar from "./Avatar";
import { T } from "@/styles/theme";

// One row in the people list. `relation` decides which action it offers, so the
// search results, the request inbox and the friends list all reuse this.
export default function UserRow({
  user,
  relation,
  onPress,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
  busy = false,
  subtitle,
}) {
  const labels = {
    none: "Προσθήκη",
    requested: "Σε αναμονή",
    incoming: "Αποδοχή",
    friends: "Μήνυμα",
    self: null,
  };

  const label = primaryLabel ?? labels[relation];
  const muted = relation === "requested";

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <Avatar uri={user.profileImageUrl} name={user.username} size={48} />

      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {user.username}
        </Text>
        {subtitle ?? user.bio ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle ?? user.bio}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {label ? (
          <Pressable
            onPress={onPrimary}
            disabled={busy || muted}
            style={({ pressed }) => [
              styles.action,
              muted ? styles.actionMuted : styles.actionPrimary,
              (pressed || busy) && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.actionText, muted && styles.actionTextMuted]}>
              {label}
            </Text>
          </Pressable>
        ) : null}

        {secondaryLabel ? (
          <Pressable
            onPress={onSecondary}
            disabled={busy}
            style={({ pressed }) => [
              styles.action,
              styles.actionMuted,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.actionText, styles.actionTextMuted]}>
              {secondaryLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: T.textFaint,
    fontSize: 12.5,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  action: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.radius.sm,
  },
  actionPrimary: {
    backgroundColor: T.primary,
  },
  actionMuted: {
    backgroundColor: T.elevated,
  },
  actionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  actionTextMuted: {
    color: T.textMuted,
  },
});
