import { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ChevronLeft,
  Bookmark,
  Star,
  CalendarDays,
  UserCheck,
  Repeat,
  Lock,
} from "lucide-react-native";

import { API_URL } from "@/constants/api";
import { formatNightKey } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./VenueAnalyticsScreen.styles";

const call = async (path) => {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Σφάλμα ${res.status}`);
  return data;
};

const RANGES = [
  { days: 7, label: "7 μέρες" },
  { days: 30, label: "30 μέρες" },
  { days: 90, label: "90 μέρες" },
];

const GENDER_LABELS = {
  male: "Άνδρες",
  female: "Γυναίκες",
  other: "Άλλο",
  unknown: "Χωρίς δήλωση",
};

export default function VenueAnalyticsScreen() {
  const navigation = useNavigation();

  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [days, setDays] = useState(30);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    call("/stores/mine")
      .then((mine) => {
        setStores(mine);
        setStoreId((prev) => prev ?? mine[0]?._id ?? null);
        if (!mine.length) setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const load = useCallback(async () => {
    if (!storeId) return;

    setLoading(true);
    try {
      setData(await call(`/stores/${storeId}/analytics?days=${days}`));
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
    }
  }, [storeId, days]);

  useEffect(() => {
    load();
  }, [load]);

  const store = stores.find((s) => s._id === storeId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <ChevronLeft size={22} color={T.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Στατιστικά</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {store ? <Text style={styles.storeName}>{store.name}</Text> : null}

        <View style={styles.ranges}>
          {RANGES.map(({ days: d, label }) => {
            const active = d === days;
            return (
              <Pressable
                key={d}
                onPress={() => setDays(d)}
                style={[styles.range, active && styles.rangeActive]}
              >
                <Text
                  style={[styles.rangeText, active && styles.rangeTextActive]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading || !data ? (
          <ActivityIndicator color={T.primary} style={styles.loader} />
        ) : (
          <>
            {/* ---- the funnel ---- */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Κρατήσεις</Text>

              <View style={styles.statRow}>
                <Stat value={data.bookings.requested} label="Αιτήματα" />
                <Stat
                  value={data.bookings.confirmed}
                  label="Δέχτηκες"
                  tone={T.primary}
                />
                <Stat
                  value={data.bookings.covers}
                  label="Άτομα ήρθαν"
                  tone={T.accent}
                />
              </View>

              <View style={styles.rateRow}>
                <Rate
                  value={data.bookings.confirmRate}
                  label="ποσοστό αποδοχής"
                />
                <Rate
                  value={data.bookings.noShowRate}
                  label="δεν εμφανίστηκαν"
                  tone={T.danger}
                />
              </View>

              {data.bookings.pending ? (
                <Text style={styles.pending}>
                  {data.bookings.pending} αιτήματα περιμένουν ακόμα απάντηση.
                </Text>
              ) : null}
            </View>

            {/* ---- visitors ---- */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Επισκέπτες</Text>

              <View style={styles.statRow}>
                <Stat
                  value={data.visitors.unique}
                  label="Μοναδικοί"
                  Icon={UserCheck}
                />
                <Stat
                  value={data.visitors.returning}
                  label="Ξαναήρθαν"
                  Icon={Repeat}
                  tone={T.accent}
                />
                <Stat value={data.visitors.checkIns} label="Check-in" />
              </View>
            </View>

            {/* ---- audience ---- */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Κοινό</Text>

              {data.audience.withheld ? (
                <View style={styles.withheld}>
                  <Lock size={15} color={T.textFaint} strokeWidth={2} />
                  <Text style={styles.withheldText}>
                    {data.audience.total} επισκέπτες. Η ανάλυση εμφανίζεται από
                    5 και πάνω, ώστε να μην αναγνωρίζεται κανένας ξεχωριστά.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.subLabel}>Ηλικίες</Text>
                  {Object.entries(data.audience.ages).map(([bucket, count]) => (
                    <Bar
                      key={bucket}
                      label={bucket}
                      count={count}
                      total={data.audience.total}
                    />
                  ))}

                  <Text style={styles.subLabel}>Φύλο</Text>
                  {Object.entries(data.audience.gender)
                    .filter(([, count]) => count > 0)
                    .map(([key, count]) => (
                      <Bar
                        key={key}
                        label={GENDER_LABELS[key] ?? key}
                        count={count}
                        total={data.audience.total}
                        tone={T.primary}
                      />
                    ))}

                  {data.audience.topGenres?.length ? (
                    <>
                      <Text style={styles.subLabel}>Τι ακούνε</Text>
                      <View style={styles.genres}>
                        {data.audience.topGenres.map((g) => (
                          <View key={g.name} style={styles.genre}>
                            <Text style={styles.genreText}>
                              {g.name} · {g.count}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                </>
              )}
            </View>

            {/* ---- busiest nights ---- */}
            {data.busiestNights.length ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Καλύτερες βραδιές</Text>

                {data.busiestNights.map((night) => (
                  <Bar
                    key={night.dateKey}
                    label={formatNightKey(night.dateKey)}
                    count={night.covers}
                    total={data.busiestNights[0].covers}
                    tone={T.accent}
                    suffix=" άτομα"
                  />
                ))}
              </View>
            ) : null}

            {/* ---- reach ---- */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Προβολή</Text>

              <View style={styles.statRow}>
                <Stat value={data.saves} label="Αποθηκεύσεις" Icon={Bookmark} />
                <Stat
                  value={data.reviews.average || "—"}
                  label={`${data.reviews.count} κριτικές`}
                  Icon={Star}
                  tone={T.warning}
                />
                <Stat
                  value={data.events.attendants}
                  label={`σε ${data.events.total} events`}
                  Icon={CalendarDays}
                />
              </View>
            </View>

            <Text style={styles.footnote}>
              Περίοδος {data.range.from} → {data.range.to}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, Icon, tone }) {
  return (
    <View style={styles.stat}>
      {Icon ? <Icon size={14} color={tone ?? T.textMuted} strokeWidth={2.2} /> : null}
      <Text style={[styles.statValue, tone && { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

// A rate of null means there was nothing to divide by, which is different from
// zero — say so rather than showing a confident 0%.
function Rate({ value, label, tone }) {
  return (
    <View style={styles.rate}>
      <Text style={[styles.rateValue, tone && { color: tone }]}>
        {value == null ? "—" : `${value}%`}
      </Text>
      <Text style={styles.rateLabel}>{label}</Text>
    </View>
  );
}

function Bar({ label, count, total, tone, suffix = "" }) {
  const pct = total ? (count / total) * 100 : 0;

  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%`, backgroundColor: tone ?? T.textMuted },
          ]}
        />
      </View>
      <Text style={styles.barCount}>
        {count}
        {suffix}
      </Text>
    </View>
  );
}
