import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Crosshair, X } from "lucide-react-native";

import StorePin from "../../components/StorePin";
import SearchField from "@/components/SearchField";
import Chip from "@/components/Chip";
import StoreSheet from "./StoreSheet";
import { storesService, CATEGORIES } from "@/services/stores.service";
import { T } from "@/styles/theme";
import styles from "./HomeScreen.styles";

// Where the map opens when location permission is refused, so the screen is
// never blank: the middle of Thessaloniki, zoomed out enough to show the city.
const FALLBACK_REGION = {
  latitude: 40.6401,
  longitude: 22.9444,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

// Metres between two coordinates.
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

// More than 25m off the drawn line means the driver missed a turn.
const isOffRoute = (current, path) => {
  if (!path || path.length === 0) return false;

  let minDist = Infinity;

  for (let i = 0; i < path.length; i++) {
    const d = haversineDistance(current, path[i]);
    if (d < minDist) minDist = d;
  }

  return minDist > 25;
};

export default function HomeScreen() {
  const mapRef = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();

  const [region, setRegion] = useState(null);
  const [hasLocation, setHasLocation] = useState(false);

  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [navigating, setNavigating] = useState(false);
  const [followUser, setFollowUser] = useState(true);

  // The location subscription is created once, so the values it reads have to
  // live in refs — otherwise the callback keeps looking at the first render.
  const followUserRef = useRef(true);
  const navigatingRef = useRef(false);
  const routeCoordsRef = useRef([]);
  const lastRerouteRef = useRef(0);
  const regionRef = useRef(null);
  const destinationRef = useRef(null);

  useEffect(() => {
    followUserRef.current = followUser;
  }, [followUser]);
  useEffect(() => {
    navigatingRef.current = navigating;
  }, [navigating]);
  useEffect(() => {
    routeCoordsRef.current = routeCoords;
  }, [routeCoords]);
  useEffect(() => {
    regionRef.current = region;
  }, [region]);

  /* =========================
     LOCATION
  ========================= */
  useEffect(() => {
    let sub;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        if (!cancelled) setRegion(FALLBACK_REGION);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      if (cancelled) return;

      const initial = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      };

      setRegion(initial);
      setHasLocation(true);

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1,
          timeInterval: 1500,
        },
        (update) => {
          const coords = {
            latitude: update.coords.latitude,
            longitude: update.coords.longitude,
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
          };

          setRegion(coords);

          if (followUserRef.current && mapRef.current) {
            mapRef.current.animateToRegion(coords, 500);
          }

          if (navigatingRef.current && routeCoordsRef.current.length > 0) {
            const now = Date.now();

            if (
              isOffRoute(coords, routeCoordsRef.current) &&
              now - lastRerouteRef.current > 10000
            ) {
              lastRerouteRef.current = now;
              getDirections(destinationRef.current);
            }
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  /* =========================
     STORES
  ========================= */
  const loadStores = useCallback(async () => {
    try {
      const data = await storesService.list({
        q: query.trim() || undefined,
        category: category === "all" ? undefined : category,
        lat: hasLocation ? region?.latitude : undefined,
        lng: hasLocation ? region?.longitude : undefined,
      });
      setStores(data);
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoadingStores(false);
    }
    // region is intentionally not a dependency: refetching on every GPS tick
    // would hammer the API. Distance is close enough from the first fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, hasLocation]);

  useEffect(() => {
    const timer = setTimeout(loadStores, query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [loadStores, query]);

  /* =========================
     DEEP LINK FROM THE EVENTS TAB
  ========================= */
  useEffect(() => {
    const focusStoreId = route.params?.focusStoreId;
    if (!focusStoreId) return;

    const store = stores.find((s) => s._id === focusStoreId);

    if (store?.location) {
      mapRef.current?.animateToRegion(
        {
          latitude: store.location.lat,
          longitude: store.location.lng,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        },
        600,
      );
      setFollowUser(false);
    }

    setSelectedStore(store ?? { _id: focusStoreId });
    navigation.setParams({ focusStoreId: undefined });
  }, [route.params?.focusStoreId, stores, navigation]);

  /* =========================
     ROUTING
  ========================= */
  const getDirections = async (destination) => {
    const from = regionRef.current;
    if (!from || !destination) return;

    destinationRef.current = destination;

    try {
      const url =
        `https://api.openrouteservice.org/v2/directions/driving-car` +
        `?api_key=${process.env.EXPO_PUBLIC_ORS_API_KEY}` +
        `&start=${from.longitude},${from.latitude}` +
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
      setFollowUser(false);

      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 140, right: 50, bottom: 160, left: 50 },
        animated: true,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const stopNavigation = () => {
    setNavigating(false);
    setRouteCoords([]);
    setEta(null);
    setDistance(null);
    destinationRef.current = null;
  };

  const startNavigationTo = (store) => {
    const dest = {
      latitude: store.location?.lat ?? store.latitude,
      longitude: store.location?.lng ?? store.longitude,
    };

    setSelectedStore(null);
    getDirections(dest);
  };

  if (!region) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={T.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={hasLocation}
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
          const latitude = store.location?.lat ?? store.latitude;
          const longitude = store.location?.lng ?? store.longitude;

          if (latitude == null || longitude == null) return null;

          return (
            <Marker
              key={store._id || store.id}
              coordinate={{ latitude, longitude }}
              tracksViewChanges={false}
            >
              <StorePin store={store} onPress={() => setSelectedStore(store)} />
            </Marker>
          );
        })}
      </MapView>

      {/* ---- search + filters ---- */}
      <View style={styles.searchOverlay} pointerEvents="box-none">
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Ψάξε μαγαζί ή περιοχή"
          style={styles.search}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map(({ key, label }) => (
            <Chip
              key={key}
              label={label}
              active={category === key}
              onPress={() => setCategory(key)}
            />
          ))}
        </ScrollView>

        {!loadingStores && query.trim() ? (
          <View style={styles.resultCount}>
            <Text style={styles.resultCountText}>
              {stores.length}{" "}
              {stores.length === 1 ? "αποτέλεσμα" : "αποτελέσματα"}
            </Text>
          </View>
        ) : null}
      </View>

      {!followUser && hasLocation ? (
        <TouchableOpacity
          style={styles.focusButton}
          onPress={() => {
            setFollowUser(true);
            if (regionRef.current && mapRef.current) {
              mapRef.current.animateToRegion(regionRef.current, 500);
            }
          }}
        >
          <Crosshair size={20} color={T.text} strokeWidth={2.2} />
        </TouchableOpacity>
      ) : null}

      {navigating ? (
        <View style={styles.routeCard}>
          <View style={styles.routeStats}>
            <Text style={styles.routeText}>
              🚗 {distance?.toFixed(1)} χλμ
            </Text>
            <Text style={styles.routeText}>⏱ {eta?.toFixed(0)} λεπτά</Text>
          </View>

          <TouchableOpacity onPress={stopNavigation} hitSlop={10}>
            <X size={18} color={T.textMuted} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      ) : null}

      <StoreSheet
        storeId={selectedStore?._id ?? null}
        distanceKm={selectedStore?.distanceKm}
        onClose={() => setSelectedStore(null)}
        onNavigate={startNavigationTo}
      />
    </View>
  );
}
