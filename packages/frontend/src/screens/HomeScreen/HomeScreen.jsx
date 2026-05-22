import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import StorePin from "../../components/StorePin";
import { API_URL } from "../../constants/api";
import styles from "./HomeScreen.styles";

export default function HomeScreen() {
  const mapRef = useRef(null);

  const [region, setRegion] = useState(null);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [navigating, setNavigating] = useState(false);
  const [followUser, setFollowUser] = useState(true);

  const [lastReroute, setLastReroute] = useState(0);

  useEffect(() => {
    let sub;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});

      const initial = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      };

      setRegion(initial);

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1,
          timeInterval: 1500,
        },
        (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
          };

          setRegion(coords);

          if (followUser && mapRef.current) {
            mapRef.current.animateToRegion(coords, 500);
          }

          if (navigating && routeCoords.length > 0) {
            const now = Date.now();

            if (isOffRoute(coords, routeCoords) && now - lastReroute > 10000) {
              setLastReroute(now);
              getDirections(coords);
            }
          }
        },
      );
    })();

    return () => sub?.remove();
  }, [followUser, navigating]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/stores`);
        const data = await res.json();
        setStores(data);
      } catch (e) {
        console.log(e);
      }
    })();
  }, []);

  const getDirections = async (destination) => {
    if (!region) return;

    try {
      const url =
        `https://api.openrouteservice.org/v2/directions/driving-car` +
        `?api_key=${process.env.EXPO_PUBLIC_ORS_API_KEY}` +
        `&start=${region.longitude},${region.latitude}` +
        `&end=${destination.longitude},${destination.latitude}`;

      const res = await fetch(url);
      const data = await res.json();

      const coords = data.features[0].geometry.coordinates.map((c) => ({
        latitude: c[1],
        longitude: c[0],
      }));

      const summary = data.features[0].properties.summary;

      setRouteCoords(coords);
      setDistance(summary.distance / 1000);
      setEta(summary.duration / 60);
      setNavigating(true);

      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 50, bottom: 120, left: 50 },
        animated: true,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const haversineDistance = (a, b) => {
    const toRad = (x) => (x * Math.PI) / 180;

    const R = 6371e3;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);

    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };

  const isOffRoute = (current, route) => {
    if (!route || route.length === 0) return false;

    let minDist = Infinity;

    for (let i = 0; i < route.length; i++) {
      const d = haversineDistance(current, route[i]);
      if (d < minDist) minDist = d;
    }

    return minDist > 25;
  };

  if (!region) return null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        followsUserLocation={false}
        onPanDrag={() => setFollowUser(false)}
        onTouchStart={() => setFollowUser(false)}
      >
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor="#2F6BFF"
          />
        )}

        {stores.map((store) => {
          const latitude = store.location?.lat || store.latitude;
          const longitude = store.location?.lng || store.longitude;

          return (
            <Marker
              key={store._id || store.id}
              coordinate={{ latitude, longitude }}
            >
              <StorePin store={store} onPress={() => setSelectedStore(store)} />
            </Marker>
          );
        })}
      </MapView>

      {!followUser && (
        <TouchableOpacity
          style={styles.focusButton}
          onPress={() => {
            setFollowUser(true);

            if (region && mapRef.current) {
              mapRef.current.animateToRegion(region, 500);
            }
          }}
        >
          <Text style={styles.focusText}>🎯</Text>
        </TouchableOpacity>
      )}

      {navigating && (
        <View style={styles.routeCard}>
          <Text style={styles.routeText}>🚗 {distance?.toFixed(1)} km</Text>
          <Text style={styles.routeText}>⏱ {eta?.toFixed(0)} min</Text>
        </View>
      )}

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
                      "https://via.placeholder.com/400",
                  }}
                  style={styles.modalImage}
                />

                <View style={styles.modalContent}>
                  <Text style={styles.modalHeader}>Κατάστημα</Text>
                  <Text style={styles.modalTitle}>{selectedStore?.name}</Text>

                  <Text style={styles.modalDescription}>
                    {selectedStore?.description}
                  </Text>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedStore(null)}
                  >
                    <Text style={styles.closeButtonText}>Κλείσιμο</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.closeButton, { marginTop: 10 }]}
                    onPress={() => {
                      const dest = {
                        latitude:
                          selectedStore.location?.lat || selectedStore.latitude,
                        longitude:
                          selectedStore.location?.lng ||
                          selectedStore.longitude,
                      };

                      setSelectedStore(null);
                      getDirections(dest);
                    }}
                  >
                    <Text style={styles.closeButtonText}>Start Navigation</Text>
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
