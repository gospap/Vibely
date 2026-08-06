import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import X from "lucide-react-native/dist/esm/icons/x";
import Users from "lucide-react-native/dist/esm/icons/users";
import Clock from "lucide-react-native/dist/esm/icons/clock";

import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import { API_URL } from "@/constants/api";
import { formatNightKey } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./VenueBookingSheet.styles";

// Answer one booking: give it a table, add a word back, or mark the door.
export default function VenueBookingSheet({ reservation, onClose, onUpdated }) {
  const [tableLabel, setTableLabel] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    setTableLabel(reservation?.tableLabel ?? "");
    setResponseNote(reservation?.responseNote ?? "");
  }, [reservation?._id, reservation?.tableLabel, reservation?.responseNote]);

  const patch = async (status) => {
    setBusy(status);
    try {
      const res = await fetch(`${API_URL}/reservations/${reservation._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          tableLabel: tableLabel.trim(),
          responseNote: responseNote.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Σφάλμα ${res.status}`);

      onUpdated?.(data);
    } catch (err) {
      Alert.alert("Δεν έγινε", err.message);
    } finally {
      setBusy(null);
    }
  };

  const pending = reservation?.status === "pending";

  return (
    <Modal
      visible={!!reservation}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Avatar
              uri={reservation?.user?.profileImageUrl}
              name={reservation?.user?.username}
              size={42}
            />

            <View style={styles.headerText}>
              <Text style={styles.name} numberOfLines={1}>
                {reservation?.contactName ||
                  reservation?.user?.username ||
                  "Χρήστης"}
              </Text>

              <View style={styles.facts}>
                <View style={styles.factRow}>
                  <Users size={12} color={T.textFaint} strokeWidth={2.2} />
                  <Text style={styles.fact}>{reservation?.partySize}</Text>
                </View>
                {reservation?.arrivalTime ? (
                  <View style={styles.factRow}>
                    <Clock size={12} color={T.textFaint} strokeWidth={2.2} />
                    <Text style={styles.fact}>{reservation.arrivalTime}</Text>
                  </View>
                ) : null}
                <Text style={styles.fact}>
                  {formatNightKey(reservation?.dateKey)}
                </Text>
              </View>
            </View>

            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <X size={18} color={T.text} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View style={styles.body}>
            {reservation?.contactPhone ? (
              <Text style={styles.phone}>{reservation.contactPhone}</Text>
            ) : null}

            {reservation?.note ? (
              <Text style={styles.note}>«{reservation.note}»</Text>
            ) : null}

            <Text style={styles.label}>Τραπέζι</Text>
            <TextInput
              value={tableLabel}
              onChangeText={setTableLabel}
              placeholder="π.χ. 4"
              placeholderTextColor={T.textFaint}
              style={styles.input}
              maxLength={12}
            />

            <Text style={styles.label}>Μήνυμα προς τον πελάτη</Text>
            <TextInput
              value={responseNote}
              onChangeText={setResponseNote}
              placeholder="Προαιρετικό"
              placeholderTextColor={T.textFaint}
              style={styles.input}
              maxLength={160}
            />

            {pending ? (
              <View style={styles.actions}>
                <Button
                  label="Απόρριψη"
                  variant="danger"
                  loading={busy === "declined"}
                  onPress={() => patch("declined")}
                  style={styles.action}
                />
                <Button
                  label="Επιβεβαίωση"
                  loading={busy === "confirmed"}
                  onPress={() => patch("confirmed")}
                  style={styles.action}
                />
              </View>
            ) : (
              // Door actions. Marking someone in also stamps their loyalty card.
              <View style={styles.actions}>
                <Button
                  label="Δεν ήρθαν"
                  variant="danger"
                  loading={busy === "no_show"}
                  onPress={() => patch("no_show")}
                  style={styles.action}
                />
                <Button
                  label="Ήρθαν"
                  loading={busy === "seated"}
                  onPress={() => patch("seated")}
                  style={styles.action}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
