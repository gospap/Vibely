import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { X, Camera } from "lucide-react-native";

import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import Chip from "@/components/Chip";
import { usersService } from "@/services/users.service";
import { eventsService } from "@/services/events.service";
import { uploadsService } from "@/services/uploads.service";
import { T } from "@/styles/theme";
import styles from "./EditProfileModal.styles";

const GENDERS = [
  { key: "male", label: "Άνδρας" },
  { key: "female", label: "Γυναίκα" },
  { key: "other", label: "Άλλο" },
];

// No date picker dependency, so the birthday is typed. Anything that is not a
// real ΗΗ/ΜΜ/ΕΕΕΕ date is rejected before we send it.
const toDisplayDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const parseDate = (text) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;

  const [, dd, mm, yyyy] = match.map(Number);
  const date = new Date(yyyy, mm - 1, dd);

  // Rejects 31/02 style input, which Date would silently roll over.
  const valid =
    date.getFullYear() === yyyy &&
    date.getMonth() === mm - 1 &&
    date.getDate() === dd &&
    date < new Date();

  return valid ? date : null;
};

export default function EditProfileModal({ visible, user, onClose, onSaved }) {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState(null);
  const [birthday, setBirthday] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [genres, setGenres] = useState([]);
  const [allGenres, setAllGenres] = useState([]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Reset the form every time the sheet opens, so a cancelled edit is dropped.
  useEffect(() => {
    if (!visible) return;

    setUsername(user.username ?? "");
    setBio(user.bio ?? "");
    setGender(user.gender ?? null);
    setBirthday(toDisplayDate(user.dateOfBirth));
    setAvatar(user.profileImageUrl ?? null);
    setGenres(user.favouriteGenres ?? []);

    eventsService.genres().then(setAllGenres).catch(() => setAllGenres([]));
  }, [visible, user]);

  const pickAvatar = async () => {
    setUploading(true);
    try {
      const url = await uploadsService.pickAndUpload("avatars", {
        allowsEditing: true,
      });
      if (url) setAvatar(url);
    } catch (err) {
      Alert.alert("Σφάλμα", err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleGenre = (genre) =>
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );

  const save = async () => {
    const name = username.trim();
    if (!name) {
      Alert.alert("Λείπει το όνομα", "Το όνομα χρήστη δεν μπορεί να είναι κενό.");
      return;
    }

    let dateOfBirth;
    if (birthday.trim()) {
      const parsed = parseDate(birthday);
      if (!parsed) {
        Alert.alert("Λάθος ημερομηνία", "Γράψε την ημερομηνία ως ΗΗ/ΜΜ/ΕΕΕΕ.");
        return;
      }
      dateOfBirth = parsed.toISOString();
    }

    setSaving(true);
    try {
      await usersService.updateProfile({
        username: name,
        bio: bio.trim(),
        gender: gender ?? undefined,
        dateOfBirth,
        profileImageUrl: avatar ?? undefined,
        favouriteGenres: genres,
      });
      onSaved();
    } catch (err) {
      Alert.alert("Δεν αποθηκεύτηκε", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={24} color={T.text} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitle}>Επεξεργασία προφίλ</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.avatarPicker} onPress={pickAvatar}>
            <Avatar uri={avatar} name={username} size={96} />

            <View style={styles.avatarBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Camera size={15} color="#fff" strokeWidth={2.2} />
              )}
            </View>
          </Pressable>

          <Field label="Όνομα χρήστη">
            <TextInput
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              placeholder="Το όνομά σου"
              placeholderTextColor={T.textFaint}
              maxLength={40}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Bio">
            <TextInput
              value={bio}
              onChangeText={setBio}
              style={[styles.input, styles.inputMultiline]}
              placeholder="Πες δυο λόγια για σένα"
              placeholderTextColor={T.textFaint}
              multiline
              maxLength={160}
            />
            <Text style={styles.counter}>{bio.length}/160</Text>
          </Field>

          <Field label="Ημερομηνία γέννησης">
            <TextInput
              value={birthday}
              onChangeText={setBirthday}
              style={styles.input}
              placeholder="ΗΗ/ΜΜ/ΕΕΕΕ"
              placeholderTextColor={T.textFaint}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </Field>

          <Field label="Φύλο">
            <View style={styles.row}>
              {GENDERS.map(({ key, label }) => (
                <Chip
                  key={key}
                  label={label}
                  active={gender === key}
                  onPress={() => setGender(gender === key ? null : key)}
                />
              ))}
            </View>
          </Field>

          {allGenres.length ? (
            <Field label="Μουσική που σου αρέσει">
              <View style={styles.row}>
                {allGenres.map((genre) => (
                  <Chip
                    key={genre}
                    label={genre}
                    active={genres.includes(genre)}
                    onPress={() => toggleGenre(genre)}
                  />
                ))}
              </View>
            </Field>
          ) : null}

          <Button label="Αποθήκευση" loading={saving} onPress={save} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}
