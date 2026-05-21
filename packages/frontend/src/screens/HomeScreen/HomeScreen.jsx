import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import StorePin from "../../components/StorePin";

export default function HomeScreen() {
  const [region, setRegion] = useState(null);
  const [heading, setHeading] = useState(0);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  const router = useRouter();

  useEffect(() => {
    let subscription;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      let loc = await Location.getCurrentPositionAsync({});

      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });

          setHeading(loc.coords.heading || 0);
        },
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch(`${API_URL}/stores`);
        const data = await res.json();
        setStores(data);
      } catch (err) {
        console.error("Failed to fetch stores", err);
      }
    };

    fetchStores();
  }, []);

  if (!region) return null;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {stores.map((store) => {
          const latitude = store.location?.lat || store.latitude || 0;
          const longitude = store.location?.lng || store.longitude || 0;
          const storeId = store._id || store.id;

          return (
            <Marker key={storeId} coordinate={{ latitude, longitude }}>
              <StorePin store={store} onPress={() => setSelectedStore(store)} />
            </Marker>
          );
        })}
      </MapView>

      <Modal visible={!!selectedStore} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setSelectedStore(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Image
                  source={{
                    uri:
                      selectedStore?.images?.[0] ||
                      selectedStore?.imageUrl ||
                      "https://via.placeholder.com/400x240?text=Vibely",
                  }}
                  style={styles.modalImage}
                />
                <View style={styles.modalContent}>
                  <Text style={styles.modalHeader}>
                    Πληροφορίες Καταστήματος
                  </Text>
                  <Text style={styles.modalTitle}>{selectedStore?.name}</Text>
                  <Text style={styles.modalDescription}>
                    {selectedStore?.description ||
                      "Δεν υπάρχουν επιπλέον πληροφορίες."}
                  </Text>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Βαθμολογία</Text>
                    <Text style={styles.infoValue}>
                      {selectedStore?.ratings?.average?.toFixed(1) ?? "N/A"} (
                      {selectedStore?.ratings?.count ?? 0})
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Δημιουργήθηκε</Text>
                    <Text style={styles.infoValue}>
                      {selectedStore?.createdAt
                        ? new Date(selectedStore.createdAt).toLocaleDateString(
                            "el-GR",
                          )
                        : "-"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedStore(null)}
                  >
                    <Text style={styles.closeButtonText}>Κλείσιμο</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    maxHeight: "75%",
  },
  modalImage: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalDescription: {
    color: "#4B5563",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalHeader: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  modalMeta: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  infoValue: {
    color: "#111827",
    fontSize: 14,
  },
  closeButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: "#4F7CFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
