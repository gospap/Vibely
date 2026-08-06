import { useCallback, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";
import ChevronLeft from "lucide-react-native/dist/esm/icons/chevron-left";
import Ticket from "lucide-react-native/dist/esm/icons/ticket";
import X from "lucide-react-native/dist/esm/icons/x";
import Check from "lucide-react-native/dist/esm/icons/check";

import EmptyState from "@/components/EmptyState";
import { API_URL } from "@/constants/api";
import { formatTimeAgo } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./WalletScreen.styles";

// Everything the guest is holding. Opening a code shows the QR full screen —
// that is the whole point of the screen, so it is one tap away.
export default function WalletScreen() {
  const navigation = useNavigation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/users/me/wallet`, {
        credentials: "include",
      });
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <ChevronLeft size={22} color={T.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Το πορτοφόλι μου</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={T.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={T.textMuted}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Ticket}
              title="Κανένας κωδικός ακόμα"
              subtitle="Όταν πάρεις μια προσφορά, ο κωδικός σου θα εμφανιστεί εδώ."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, !item.usable && styles.rowSpent]}
              onPress={() => item.usable && setOpen(item)}
            >
              <Image
                source={{ uri: item.store.image }}
                style={styles.image}
              />

              <View style={styles.rowBody}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.venue} numberOfLines={1}>
                  {item.store.name}
                </Text>

                {item.usable ? (
                  <Text style={styles.tapHint}>
                    Πάτα για το QR{item.until ? ` · έως ${item.until}` : ""}
                  </Text>
                ) : (
                  <Text style={styles.spent}>
                    {item.redeemed
                      ? `Χρησιμοποιήθηκε ${formatTimeAgo(item.redeemedAt)}`
                      : "Έληξε"}
                  </Text>
                )}
              </View>

              <View
                style={[styles.code, !item.usable && styles.codeSpent]}
              >
                {item.redeemed ? (
                  <Check size={16} color={T.textFaint} strokeWidth={2.6} />
                ) : (
                  <Text
                    style={[
                      styles.codeText,
                      !item.usable && styles.codeTextSpent,
                    ]}
                  >
                    {item.code}
                  </Text>
                )}
              </View>
            </Pressable>
          )}
        />
      )}

      {/* ---- the QR itself ---- */}
      <Modal
        visible={!!open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(null)}
      >
        <View style={styles.qrBackdrop}>
          <Pressable
            style={styles.qrBackdropTap}
            onPress={() => setOpen(null)}
          />

          <View style={styles.qrCard}>
            <Pressable
              style={styles.qrClose}
              onPress={() => setOpen(null)}
              hitSlop={8}
            >
              <X size={18} color={T.text} strokeWidth={2.4} />
            </Pressable>

            <Text style={styles.qrVenue}>{open?.store?.name}</Text>
            <Text style={styles.qrTitle} numberOfLines={2}>
              {open?.title}
            </Text>

            {/* White plate behind the code: scanners need the contrast, and the
                app is dark everywhere else. */}
            <View style={styles.qrPlate}>
              {open ? (
                <QRCode value={open.qr} size={196} backgroundColor="#fff" />
              ) : null}
            </View>

            <Text style={styles.qrCode}>{open?.code}</Text>
            <Text style={styles.qrHint}>
              Δείξε το στην υποδοχή. Αν δεν έχουν scanner, πες τους τον κωδικό.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
