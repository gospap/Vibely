import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  Activity,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Clock3,
  CornerUpLeft,
  CornerUpRight,
  Crosshair,
  MapPin,
  Navigation as NavigationIcon,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react-native";

import StorePin from "@/components/StorePin";
import SearchField from "@/components/SearchField";
import Chip from "@/components/Chip";
import StoreSheet from "./StoreSheet";
import { API_URL } from "@/constants/api";
import { CATEGORIES } from "@/constants/categories";
import { toQuery } from "@/utils/query";
import { T } from "@/styles/theme";
import styles from "./HomeScreen.styles";
import {
  extractSteps,
  formatDistance,
  isOffRoute,
  resolveManeuver,
  spokenPhrase,
  SPEECH_THRESHOLDS,
} from "@/utils/navigation";

// Where the map opens when location permission is refused, so the screen is
// never blank: the middle of Thessaloniki, zoomed out enough to show the city.
const FALLBACK_REGION = {
  latitude: 40.6401,
  longitude: 22.9444,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

// The routing API numbers its maneuvers; these are the arrows for each one.
const MANEUVER_ICONS = {
  0: CornerUpLeft, // left
  1: CornerUpRight, // right
  2: CornerUpLeft, // sharp left
  3: CornerUpRight, // sharp right
  4: ArrowUpLeft, // slight left
  5: ArrowUpRight, // slight right
  6: ArrowUp, // straight
  7: RotateCcw, // enter roundabout
  8: RotateCcw, // exit roundabout
  9: RotateCcw, // u-turn
  10: MapPin, // arrive
  11: NavigationIcon, // depart
  12: ArrowUpLeft, // keep left
  13: ArrowUpRight, // keep right
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
  const [maneuver, setManeuver] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // The location subscription is created once, so the values it reads have to
  // live in refs — otherwise the callback keeps looking at the first render.
  const followUserRef = useRef(true);
  const navigatingRef = useRef(false);
  const routeCoordsRef = useRef([]);
  const lastRerouteRef = useRef(0);
  const regionRef = useRef(null);
  const destinationRef = useRef(null);
  const stepsRef = useRef([]);
  const voiceEnabledRef = useRef(true);

  // Which distance warnings have already been spoken for the maneuver in play,
  // so the phone says "σε 150 μέτρα, στρίψτε δεξιά" once and not every 1.5s.
  const spokenRef = useRef({ key: null, thresholds: new Set() });

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
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
    if (!voiceEnabled) Speech.stop();
  }, [voiceEnabled]);

  // Never leave a sentence playing after the screen is gone.
  useEffect(() => () => Speech.stop(), []);

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
            if (isOffRoute(coords, routeCoordsRef.current)) {
              // The steps belong to a route the driver has left, so the banner
              // is frozen on purpose until the new one lands.
              const now = Date.now();

              if (now - lastRerouteRef.current > 10000) {
                lastRerouteRef.current = now;
                getDirections(destinationRef.current);
              }
            } else {
              trackManeuver(coords);
            }
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
    // getDirections and trackManeuver are deliberately not dependencies: both
    // read their inputs from refs, so the copies captured here stay correct,
    // and re-listing them would tear down and rebuild the GPS subscription on
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     STORES
  ========================= */
  const loadStores = useCallback(async () => {
    try {
      const params = toQuery({
        q: query.trim() || undefined,
        category: category === "all" ? undefined : category,
        lat: hasLocation ? region?.latitude : undefined,
        lng: hasLocation ? region?.longitude : undefined,
      });

      const res = await fetch(`${API_URL}/stores${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Σφάλμα ${res.status}`);

      setStores(await res.json());
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
     VOICE
  ========================= */
  // The instruction text already arrives in Greek, so it only has to be read
  // out in a Greek voice. Anything still playing is cut off first: a stale
  // "στρίψτε δεξιά" queued behind the current turn is worse than silence.
  const say = (text) => {
    if (!voiceEnabledRef.current || !text) return;

    Speech.stop();
    Speech.speak(text, { language: "el-GR", rate: 1.0 });
  };

  /* =========================
     TURN-BY-TURN
  ========================= */
  const trackManeuver = (coords) => {
    const next = resolveManeuver(
      stepsRef.current,
      routeCoordsRef.current,
      coords,
    );
    if (!next) return;

    setManeuver(next);

    // A different turn is now the one ahead — start its warnings from scratch.
    if (spokenRef.current.key !== next.key) {
      spokenRef.current = { key: next.key, thresholds: new Set() };
    }

    const { thresholds } = spokenRef.current;
    const crossed = SPEECH_THRESHOLDS.filter(
      (t) => next.distance <= t && !thresholds.has(t),
    );

    if (!crossed.length) return;

    // Mark every band the driver is already inside, then announce only the
    // tightest one — coming in fast past several at once should say "τώρα",
    // not recite "σε 400 μέτρα" after the turn has arrived.
    crossed.forEach((t) => thresholds.add(t));
    say(spokenPhrase(Math.min(...crossed), next.instruction));
  };

  /* =========================
     ROUTING
  ========================= */
  const getDirections = async (destination) => {
    const from = regionRef.current;
    if (!from || !destination) return;

    destinationRef.current = destination;

    // Without a key the routing call comes back 403 and the button looks dead,
    // which is a miserable thing to debug from the outside.
    if (!process.env.EXPO_PUBLIC_ORS_API_KEY) {
      Alert.alert(
        "Λείπει το κλειδί πλοήγησης",
        "Πρόσθεσε το EXPO_PUBLIC_ORS_API_KEY στο .env και κάνε restart τον Metro.",
      );
      return;
    }

    try {
      // The POST form of the endpoint is the one that takes options — the bare
      // GET only accepts the two coordinates, and without `language` the
      // maneuvers come back in English inside an otherwise Greek app.
      const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          method: "POST",
          headers: {
            Authorization: process.env.EXPO_PUBLIC_ORS_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/geo+json",
          },
          body: JSON.stringify({
            coordinates: [
              [from.longitude, from.latitude],
              [destination.longitude, destination.latitude],
            ],
            // Greek is "gr" here, not the "el" you would expect.
            language: "gr",
            instructions: true,
            units: "m",
          }),
        },
      );

      const data = await res.json();
      const feature = data.features?.[0];

      if (!feature) {
        // ORS nests its complaint differently depending on what went wrong.
        throw new Error(
          data.error?.message ?? data.error ?? `Σφάλμα ${res.status}`,
        );
      }

      const coords = feature.geometry.coordinates.map((c) => ({
        latitude: c[1],
        longitude: c[0],
      }));

      const summary = feature.properties.summary;
      const steps = extractSteps(feature);

      stepsRef.current = steps;
      routeCoordsRef.current = coords;
      spokenRef.current = { key: null, thresholds: new Set() };

      setRouteCoords(coords);
      setDistance(summary.distance / 1000);
      setEta(summary.duration / 60);
      setNavigating(true);
      setFollowUser(false);

      const first = resolveManeuver(steps, coords, from);
      setManeuver(first);

      // Read the departure instruction out immediately. Waiting for the first
      // distance warning would leave the driver in silence when the opening
      // leg is a couple of kilometres long.
      if (first) {
        spokenRef.current = { key: first.key, thresholds: new Set() };
        say(steps[0]?.instruction ?? first.instruction);
      }

      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 140, right: 50, bottom: 160, left: 50 },
        animated: true,
      });
    } catch (e) {
      Alert.alert("Η πλοήγηση απέτυχε", e.message);
    }
  };

  const stopNavigation = () => {
    Speech.stop();

    setNavigating(false);
    setRouteCoords([]);
    setEta(null);
    setDistance(null);
    setManeuver(null);

    destinationRef.current = null;
    stepsRef.current = [];
    spokenRef.current = { key: null, thresholds: new Set() };
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

      {/* ---- upcoming turn: takes the top slot off the search while driving ---- */}
      {navigating && maneuver ? (
        <View style={styles.maneuverCard}>
          <View style={styles.maneuverIcon}>
            {React.createElement(MANEUVER_ICONS[maneuver.type] ?? ArrowUp, {
              size: 26,
              color: T.text,
              strokeWidth: 2.4,
            })}
          </View>

          <View style={styles.maneuverBody}>
            <Text style={styles.maneuverDistance}>
              {formatDistance(maneuver.distance)}
            </Text>
            <Text style={styles.maneuverText} numberOfLines={2}>
              {maneuver.instruction}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ---- search + filters ---- */}
      {/* Hidden rather than unmounted while driving, so the query and the
          selected chip are still there when navigation ends. */}
      <View
        style={[styles.searchOverlay, navigating && styles.hidden]}
        pointerEvents={navigating ? "none" : "box-none"}
      >
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

        <Pressable
          style={styles.flowButton}
          onPress={() => navigation.navigate("NightFlow")}
        >
          <Activity size={14} color={T.primary} strokeWidth={2.6} />
          <Text style={styles.flowText}>Η ροή της βραδιάς</Text>
        </Pressable>
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
            <View style={styles.routeStat}>
              <NavigationIcon size={16} color={T.textMuted} strokeWidth={2.2} />
              <Text style={styles.routeText}>{distance?.toFixed(1)} χλμ</Text>
            </View>
            <View style={styles.routeStat}>
              <Clock3 size={16} color={T.textMuted} strokeWidth={2.2} />
              <Text style={styles.routeText}>{eta?.toFixed(0)} λεπτά</Text>
            </View>
          </View>

          <View style={styles.routeActions}>
            <TouchableOpacity
              onPress={() => setVoiceEnabled((on) => !on)}
              hitSlop={10}
            >
              {voiceEnabled ? (
                <Volume2 size={18} color={T.text} strokeWidth={2.4} />
              ) : (
                <VolumeX size={18} color={T.textFaint} strokeWidth={2.4} />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={stopNavigation} hitSlop={10}>
              <X size={18} color={T.textMuted} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
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
