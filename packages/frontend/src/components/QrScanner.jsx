import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import X from "lucide-react-native/dist/esm/icons/x";

import { makeStyles, useStyles, useTheme } from "@/styles/theme";

/**
 * Full-screen QR reader for the door.
 *
 * @param {boolean}  visible
 * @param {Function} onClose
 * @param {Function} onScan   Called once per code with the raw string. Async:
 *                            the frame stays locked until it settles, so one
 *                            guest's code cannot be sent twice.
 * @param {string}   [hint]
 */
export default function QrScanner({ visible, onClose, onScan, hint }) {
  const T = useTheme();
  const styles = useStyles(styleSheet);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);

  // onBarcodeScanned fires on every frame the code is in view — dozens of times
  // while the phone is being held up. A ref rather than state because the very
  // next frame arrives long before a re-render would land.
  const lock = useRef(false);

  useEffect(() => {
    if (visible) lock.current = false;
  }, [visible]);

  const onBarcodeScanned = async ({ data }) => {
    if (lock.current || !data) return;
    lock.current = true;
    setBusy(true);

    // The door is looking at the guest, not at the screen. A buzz is what tells
    // them the scan actually registered.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      await onScan(data);
    } finally {
      setBusy(false);
      // Deliberately left locked: the parent closes on a result, and reopening
      // resets it. Keeps a code from being fired twice on the way out.
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            // Only QR: letting it read barcodes off bottles and loyalty cards
            // just means more scans to reject.
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={busy ? undefined : onBarcodeScanned}
          />
        ) : null}

        {/* ---- viewfinder ---- */}
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Text style={styles.title}>Σκανάρισμα QR</Text>
            <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
              <X size={20} color="#fff" strokeWidth={2.4} />
            </Pressable>
          </View>

          {permission?.granted ? (
            <>
              <View style={styles.frame}>
                {busy ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : null}
              </View>

              <Text style={styles.hint}>
                {hint ?? "Κράτα το QR του πελάτη μέσα στο πλαίσιο."}
              </Text>
            </>
          ) : (
            <View style={styles.permission}>
              <Text style={styles.permissionText}>
                Η Vibely χρειάζεται την κάμερα για να διαβάσει το QR.
              </Text>

              <Pressable
                style={styles.permissionButton}
                onPress={() =>
                  permission?.canAskAgain
                    ? requestPermission()
                    : Linking.openSettings()
                }
              >
                <Text style={styles.permissionButtonText}>
                  {permission?.canAskAgain
                    ? "Ενεργοποίηση κάμερας"
                    : "Άνοιγμα ρυθμίσεων"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styleSheet = makeStyles((T) => ({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },

  topBar: {
    position: "absolute",
    top: 54,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    flex: 1,
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  frame: {
    width: 250,
    height: 250,
    borderRadius: T.radius.lg,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  hint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 18,
  },

  permission: {
    gap: 16,
    paddingHorizontal: 32,
    alignItems: "center",
  },

  permissionText: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },

  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: T.radius.sm,
    backgroundColor: T.primary,
  },

  permissionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
}));
