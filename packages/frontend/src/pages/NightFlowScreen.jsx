import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Svg, { Circle, Line } from "react-native-svg";
import { ChevronLeft, Play, Pause } from "lucide-react-native";

import { API_URL } from "@/constants/api";
import { T } from "@/styles/theme";
import styles from "./NightFlowScreen.styles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CANVAS = SCREEN_WIDTH - 32;
const PADDING = 26;

// How long each hour holds on screen before the animation moves on.
const STEP_MS = 900;

const CATEGORY_COLOURS = {
  cafe: "#fbbf24",
  beach: "#38bdf8",
  rooftop: "#a78bfa",
  bar: "#4F7CFF",
  live: "#4ade80",
  club: "#f472b6",
};

const CATEGORY_LABELS = {
  cafe: "Καφέ",
  beach: "Beach bar",
  rooftop: "Rooftop",
  bar: "Bar",
  live: "Live",
  club: "Club",
};

// Fit the venues to the canvas using the middle 90% of coordinates, then clamp
// the rest to the edge. One venue in another city would otherwise squash a
// whole town into a single pixel.
function project(stores) {
  const points = stores.filter((s) => s.location?.lat && s.location?.lng);
  if (points.length < 2) return new Map();

  const span = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    const lo = at(0.05);
    const hi = at(0.95);
    return { lo, hi: hi > lo ? hi : lo + 0.001 };
  };

  const lat = span(points.map((s) => s.location.lat));
  const lng = span(points.map((s) => s.location.lng));

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const inner = CANVAS - PADDING * 2;

  return new Map(
    points.map((s) => [
      s._id,
      {
        x: PADDING + clamp((s.location.lng - lng.lo) / (lng.hi - lng.lo)) * inner,
        // Latitude grows northwards, the canvas grows downwards.
        y: PADDING + (1 - clamp((s.location.lat - lat.lo) / (lat.hi - lat.lo))) * inner,
      },
    ]),
  );
}

// The city through one night: where the crowd is, hour by hour. Everything here
// is aggregate — a dot is a venue's activity, never a person.
export default function NightFlowScreen() {
  const navigation = useNavigation();

  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/stores/night-flow`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setFlow(data);
        // Open on the first hour that actually has something in it, so the
        // animation does not start on three empty frames.
        const firstLive = data?.hours?.findIndex((_, i) =>
          Object.values(data.byCategory).some((row) => row[i] > 0),
        );
        setSlot(firstLive > 0 ? firstLive : 0);
      })
      .catch(() => setFlow(null))
      .finally(() => setLoading(false));
  }, []);

  const hourCount = flow?.hours?.length ?? 0;

  useEffect(() => {
    if (!playing || !hourCount) return undefined;

    const timer = setInterval(
      () => setSlot((s) => (s + 1) % hourCount),
      STEP_MS,
    );
    return () => clearInterval(timer);
  }, [playing, hourCount]);

  const positions = useMemo(() => project(flow?.byStore ?? []), [flow]);

  const totals = useMemo(() => {
    if (!flow) return [];
    return flow.hours.map((_, i) =>
      Object.values(flow.byCategory).reduce((sum, row) => sum + row[i], 0),
    );
  }, [flow]);

  const peak = Math.max(1, ...totals);

  // The biggest single venue reading in the night sets the dot scale, so the
  // busiest moment fills the circle and everything else reads against it.
  const busiest = useMemo(
    () => Math.max(1, ...(flow?.byStore ?? []).flatMap((s) => s.perHour)),
    [flow],
  );

  const scrub = useCallback((i) => {
    setPlaying(false);
    setSlot(i);
  }, []);

  const lead = flow?.leadPerHour?.[slot];
  const nowTotal = totals[slot] ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
          <ChevronLeft size={22} color={T.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Η ροή της βραδιάς</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={T.primary} style={styles.loader} />
      ) : !flow || !flow.byStore.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Ησυχία απόψε</Text>
          <Text style={styles.emptyText}>
            Δεν υπάρχει ακόμα κίνηση για αυτή τη βραδιά.
          </Text>
        </View>
      ) : (
        <>
          {/* ---- the hour ---- */}
          <View style={styles.clock}>
            <Text style={styles.hour}>{flow.hours[slot]}</Text>
            <View style={styles.clockRight}>
              <Text
                style={[
                  styles.lead,
                  { color: CATEGORY_COLOURS[lead] ?? T.textFaint },
                ]}
              >
                {lead ? CATEGORY_LABELS[lead] ?? lead : "—"}
              </Text>
              <Text style={styles.leadSub}>
                {nowTotal ? `${nowTotal} άτομα έξω` : "ήσυχα"}
              </Text>
            </View>
          </View>

          {/* ---- the city ---- */}
          <View style={styles.canvas}>
            <Svg width={CANVAS} height={CANVAS}>
              {/* A faint grid so the dots read as a map, not a scatter plot. */}
              {[0.25, 0.5, 0.75].map((f) => (
                <Line
                  key={`h${f}`}
                  x1={0}
                  y1={CANVAS * f}
                  x2={CANVAS}
                  y2={CANVAS * f}
                  stroke={T.border}
                  strokeWidth={1}
                />
              ))}
              {[0.25, 0.5, 0.75].map((f) => (
                <Line
                  key={`v${f}`}
                  x1={CANVAS * f}
                  y1={0}
                  x2={CANVAS * f}
                  y2={CANVAS}
                  stroke={T.border}
                  strokeWidth={1}
                />
              ))}

              {flow.byStore.map((store) => {
                const at = positions.get(store._id);
                if (!at) return null;

                const value = store.perHour[slot] ?? 0;
                const strength = value / busiest;
                const colour = CATEGORY_COLOURS[store.category] ?? T.textMuted;

                return (
                  <Circle
                    key={store._id}
                    cx={at.x}
                    cy={at.y}
                    // Never fully disappears: a dark dot still says "a venue
                    // is here, just not now".
                    r={3 + strength * 24}
                    fill={colour}
                    opacity={value ? 0.28 + strength * 0.6 : 0.12}
                  />
                );
              })}
            </Svg>
          </View>

          {/* ---- timeline ---- */}
          <View style={styles.timeline}>
            {flow.hours.map((hour, i) => {
              const height = 6 + (totals[i] / peak) * 40;
              const active = i === slot;

              return (
                <Pressable
                  key={hour}
                  style={styles.tick}
                  onPress={() => scrub(i)}
                  hitSlop={6}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: active
                          ? (CATEGORY_COLOURS[flow.leadPerHour[i]] ?? T.primary)
                          : T.elevated,
                      },
                    ]}
                  />
                  <Text style={[styles.tickLabel, active && styles.tickLabelOn]}>
                    {hour.slice(0, 2)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.controls}>
            <Pressable
              style={styles.play}
              onPress={() => setPlaying((p) => !p)}
              hitSlop={8}
            >
              {playing ? (
                <Pause size={16} color="#fff" strokeWidth={2.4} />
              ) : (
                <Play size={16} color="#fff" strokeWidth={2.4} />
              )}
              <Text style={styles.playText}>
                {playing ? "Παύση" : "Παίξε"}
              </Text>
            </Pressable>

            <View style={styles.legend}>
              {Object.keys(flow.byCategory)
                .filter((c) => flow.byCategory[c].some((n) => n > 0))
                .map((category) => (
                  <View key={category} style={styles.legendItem}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: CATEGORY_COLOURS[category] ?? T.textMuted },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {CATEGORY_LABELS[category] ?? category}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
