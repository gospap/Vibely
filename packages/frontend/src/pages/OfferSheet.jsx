import { useState } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator, Alert } from "react-native";
import { X, Tag, Check } from "lucide-react-native";

import Button from "@/components/Button";
import { API_URL } from "@/constants/api";
import { T } from "@/styles/theme";
import styles from "./OfferSheet.styles";

// Take tonight's offer and get the code to show at the bar. Deliberately not a
// payment: the guest pays nothing to Vibely, the discount happens at the till.
export default function OfferSheet({ storeId, store, offer, onClose, onClaimed }) {
  const [claim, setClaim] = useState(null);
  const [busy, setBusy] = useState(false);

  const take = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/stores/${storeId}/offer/claim`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Σφάλμα ${res.status}`);

      setClaim(data);
      onClaimed?.(data);
    } catch (err) {
      Alert.alert("Δεν έγινε", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={!!storeId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />

        <View style={styles.sheet}>
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <X size={18} color={T.text} strokeWidth={2.4} />
          </Pressable>

          {claim ? (
            <View style={styles.done}>
              <View style={styles.doneIcon}>
                <Check size={26} color={T.accent} strokeWidth={2.6} />
              </View>

              <Text style={styles.doneTitle}>
                {claim.alreadyClaimed ? "Το έχεις ήδη" : "Κλείστηκε!"}
              </Text>

              <Text style={styles.code}>{claim.code}</Text>

              <Text style={styles.doneText}>
                Δείξε τον κωδικό στο ταμείο του {store?.name}.
              </Text>

              <Button label="Εντάξει" variant="secondary" onPress={onClose} />
            </View>
          ) : (
            <View style={styles.body}>
              <View style={styles.badge}>
                <Tag size={13} color={T.accent} strokeWidth={2.4} />
                <Text style={styles.badgeText}>Απόψε</Text>
              </View>

              <Text style={styles.title}>{offer?.title}</Text>
              <Text style={styles.venue}>{store?.name}</Text>

              {offer?.detail ? (
                <Text style={styles.detail}>{offer.detail}</Text>
              ) : null}

              <View style={styles.facts}>
                <Text style={styles.fact}>Ισχύει έως {offer?.until}</Text>
                {offer?.left != null ? (
                  <Text style={styles.left}>Μένουν {offer.left}</Text>
                ) : null}
              </View>

              {busy ? (
                <ActivityIndicator color={T.primary} style={styles.loader} />
              ) : (
                <Button label="Το θέλω" onPress={take} />
              )}

              <Text style={styles.small}>
                Δεν πληρώνεις τίποτα εδώ — η έκπτωση γίνεται στο μαγαζί.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
