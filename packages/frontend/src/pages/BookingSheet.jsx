import { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { X, Minus, Plus, Check, Clock, Users } from "lucide-react-native";

import Button from "@/components/Button";
import { AuthContext } from "@/context/AuthContext";
import { API_URL } from "@/constants/api";
import {
  formatNightChip,
  formatNightKey,
  nextNights,
  toDateKey,
} from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./BookingSheet.styles";

// Session cookie or the API treats every call as a stranger.
const call = async (path, { method = "GET", body } = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Σφάλμα ${res.status}`);
  return data;
};

// Ask a venue for a table. Opened from the store sheet, or from an event sheet
// with that event attached so the venue knows which night's crowd it belongs to.
export default function BookingSheet({
  storeId,
  store,
  eventId,
  defaultDateKey,
  onClose,
  onBooked,
}) {
  const { user } = useContext(AuthContext);

  const [dateKey, setDateKey] = useState(
    defaultDateKey || toDateKey(new Date()),
  );
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);

  const [arrivalTime, setArrivalTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [note, setNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(null);

  // Reset when the sheet is opened for a different venue or night.
  useEffect(() => {
    if (!storeId) return;

    setDateKey(defaultDateKey || toDateKey(new Date()));
    setContactName(user?.username || "");
    setContactPhone("");
    setNote("");
    setPartySize(2);
    setBooked(null);
  }, [storeId, defaultDateKey, user?.username]);

  useEffect(() => {
    if (!storeId || !dateKey) return;

    let cancelled = false;
    setLoading(true);

    call(`/stores/${storeId}/availability?dateKey=${dateKey}`)
      .then((data) => {
        if (cancelled) return;
        setAvailability(data);
        // Preselect the first slot so the common case is two taps.
        setArrivalTime((prev) =>
          data.slots?.length && !data.slots.includes(prev)
            ? data.slots[0]
            : prev,
        );
      })
      .catch(() => !cancelled && setAvailability(null))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [storeId, dateKey]);

  const horizonDays =
    availability?.horizonDays ?? store?.bookings?.horizonDays ?? 14;
  const maxParty =
    availability?.maxPartySize ?? store?.bookings?.maxPartySize ?? 10;
  const nights = nextNights(horizonDays + 1);

  // null means the venue set no cap and judges each request itself.
  const remaining = availability?.remaining ?? null;
  const full = remaining != null && remaining < partySize;
  const slots = availability?.slots ?? [];

  const submit = async () => {
    if (!contactPhone.trim()) {
      Alert.alert(
        "Λείπει το τηλέφωνο",
        "Το μαγαζί το χρειάζεται για να σε βρει.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const reservation = await call("/reservations", {
        method: "POST",
        body: {
          storeId,
          eventId: eventId || undefined,
          dateKey,
          arrivalTime: arrivalTime || undefined,
          partySize,
          note: note.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim(),
        },
      });

      // Stay open on success: a pending request needs explaining, and closing
      // the sheet would look like nothing happened.
      setBooked(reservation);
      onBooked?.(reservation);
    } catch (err) {
      Alert.alert("Δεν στάλθηκε", err.message);
    } finally {
      setSubmitting(false);
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
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Κράτηση τραπεζιού</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {store?.name}
              </Text>
            </View>

            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
              <X size={18} color={T.text} strokeWidth={2.4} />
            </Pressable>
          </View>

          {booked ? (
            <Confirmation reservation={booked} onClose={onClose} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* ---- night ---- */}
              <Text style={styles.label}>Βραδιά</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {nights.map((night) => {
                  const active = night === dateKey;
                  return (
                    <Pressable
                      key={night}
                      onPress={() => setDateKey(night)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {formatNightChip(night)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* ---- arrival ---- */}
              <Text style={styles.label}>Ώρα άφιξης</Text>
              {slots.length ? (
                <View style={styles.slots}>
                  {slots.map((slot) => {
                    const active = slot === arrivalTime;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setArrivalTime(slot)}
                        style={[styles.slot, active && styles.slotActive]}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            active && styles.slotTextActive,
                          ]}
                        >
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <Clock size={15} color={T.textFaint} strokeWidth={2} />
                  <TextInput
                    value={arrivalTime}
                    onChangeText={setArrivalTime}
                    placeholder="23:00"
                    placeholderTextColor={T.textFaint}
                    style={styles.inlineInput}
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              )}

              {/* ---- party size ---- */}
              <Text style={styles.label}>Άτομα</Text>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => setPartySize((n) => Math.max(1, n - 1))}
                  hitSlop={6}
                >
                  <Minus size={17} color={T.text} strokeWidth={2.4} />
                </Pressable>

                <View style={styles.stepperValue}>
                  <Users size={15} color={T.textMuted} strokeWidth={2} />
                  <Text style={styles.stepperNumber}>{partySize}</Text>
                </View>

                <Pressable
                  style={styles.stepperButton}
                  onPress={() => setPartySize((n) => Math.min(maxParty, n + 1))}
                  hitSlop={6}
                >
                  <Plus size={17} color={T.text} strokeWidth={2.4} />
                </Pressable>
              </View>

              {loading ? (
                <ActivityIndicator color={T.primary} style={styles.loader} />
              ) : full ? (
                <Text style={styles.full}>
                  Η βραδιά είναι γεμάτη
                  {remaining > 0 ? ` — μένουν ${remaining} θέσεις` : ""}.
                </Text>
              ) : remaining != null && remaining <= 10 ? (
                <Text style={styles.hint}>Μένουν {remaining} θέσεις.</Text>
              ) : null}

              {/* ---- note ---- */}
              <Text style={styles.label}>Σημείωση</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Γενέθλια, τραπέζι κοντά στο DJ… (προαιρετικό)"
                placeholderTextColor={T.textFaint}
                style={styles.input}
                multiline
                maxLength={200}
              />

              {/* ---- contact ---- */}
              <Text style={styles.label}>Στοιχεία επικοινωνίας</Text>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="Όνομα"
                placeholderTextColor={T.textFaint}
                style={styles.inputSingle}
                maxLength={60}
              />
              <TextInput
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="Τηλέφωνο"
                placeholderTextColor={T.textFaint}
                style={styles.inputSingle}
                keyboardType="phone-pad"
                maxLength={20}
              />
              <Text style={styles.privacy}>
                Το τηλέφωνο το βλέπει μόνο το μαγαζί.
              </Text>

              <Button
                label={
                  availability?.autoConfirm ? "Κράτηση" : "Αίτημα κράτησης"
                }
                loading={submitting}
                disabled={full || loading}
                onPress={submit}
                style={styles.submit}
              />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// A pending request and a confirmed table are very different outcomes, so the
// sheet says which one happened instead of just closing.
function Confirmation({ reservation, onClose }) {
  const confirmed = reservation.status === "confirmed";

  return (
    <View style={styles.done}>
      <View style={[styles.doneIcon, confirmed && styles.doneIconOk]}>
        {confirmed ? (
          <Check size={26} color={T.accent} strokeWidth={2.6} />
        ) : (
          <Clock size={26} color={T.warning} strokeWidth={2.4} />
        )}
      </View>

      <Text style={styles.doneTitle}>
        {confirmed ? "Επιβεβαιώθηκε!" : "Στάλθηκε!"}
      </Text>

      <Text style={styles.doneText}>
        {confirmed
          ? `Τραπέζι για ${reservation.partySize}, ${formatNightKey(
              reservation.dateKey,
            ).toLowerCase()}${
              reservation.arrivalTime ? ` στις ${reservation.arrivalTime}` : ""
            }.`
          : "Το μαγαζί θα απαντήσει σύντομα. Θα το δεις στις κρατήσεις σου."}
      </Text>

      <Button label="Εντάξει" variant="secondary" onPress={onClose} />
    </View>
  );
}
