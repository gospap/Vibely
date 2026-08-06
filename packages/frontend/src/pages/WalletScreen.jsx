import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import ChevronLeft from "lucide-react-native/dist/esm/icons/chevron-left";
import Ticket from "lucide-react-native/dist/esm/icons/ticket";
import X from "lucide-react-native/dist/esm/icons/x";
import BadgeCheck from "lucide-react-native/dist/esm/icons/badge-check";

import EmptyState from "@/components/EmptyState";
import { SocketContext } from "@/context/SocketContext";
import { API_URL } from "@/constants/api";
import { formatClock, formatTimeAgo } from "@/utils/format";
import { useStyles, useTheme } from "@/styles/theme";
import styleSheet, { CARD_HEIGHT, PEEK } from "./WalletScreen.styles";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// Each venue's pass gets its own colour, derived from its id rather than stored,
// so a wallet with four passes in it reads as four different things at a glance
// — which is the entire point of a stack you only see the top strip of.
const tintFor = (id = "") => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return {
    from: `hsl(${hash}, 62%, 34%)`,
    to: `hsl(${(hash + 38) % 360}, 58%, 19%)`,
  };
};

const SPENT_TINT = { from: "#26262b", to: "#171719" };

// Everything the guest is holding, stacked the way a wallet holds cards: the
// live pass sits in front, spent ones tuck in behind it, and tapping one lifts
// it out to full size with the QR on it.
export default function WalletScreen() {
  const T = useTheme();
  const styles = useStyles(styleSheet);

  const navigation = useNavigation();
  const socket = useContext(SocketContext);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tracked by id, not by index: a pass being redeemed re-sorts the stack, and
  // an index would then be pointing at somebody else's card mid-animation.
  const [openId, setOpenId] = useState(null);

  const lift = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/users/me/wallet`, {
        credentials: "include",
      });
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /* --- the moment the door scans it ---
     The guest is holding the phone up with the QR on screen when this arrives,
     so the code has to turn into a tick where they are looking. Refetching
     would work but it is a round trip, and the server has already told us
     everything that changed. */
  useEffect(() => {
    if (!socket) return undefined;

    const onRedeemed = ({ _id, redeemedAt }) => {
      setItems((prev) =>
        prev.map((item) =>
          String(item._id) === String(_id)
            ? { ...item, redeemed: true, redeemedAt, usable: false }
            : item,
        ),
      );
    };

    socket.on("offer:redeemed", onRedeemed);
    return () => socket.off("offer:redeemed", onRedeemed);
  }, [socket]);

  // Back of the stack first. The last one drawn sits on top and is the only one
  // shown whole, so the pass you can actually use tonight has to be last.
  const passes = useMemo(
    () => [...items].sort((a, b) => Number(a.usable) - Number(b.usable)),
    [items],
  );

  const openIndex = passes.findIndex((p) => String(p._id) === String(openId));
  const open = openIndex >= 0 ? passes[openIndex] : null;

  const liftCard = (pass) => {
    setOpenId(pass._id);
    scrollRef.current?.scrollTo({ y: 0, animated: true });

    Animated.spring(lift, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 170,
      mass: 0.9,
    }).start();
  };

  const dropCard = () => {
    Animated.spring(lift, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 190,
      mass: 0.9,
      // Cleared only once it has landed, or the card would snap back to its
      // stack position before it finished travelling there.
    }).start(({ finished }) => finished && setOpenId(null));
  };

  const stackHeight = passes.length
    ? (passes.length - 1) * PEEK + CARD_HEIGHT
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={() => (open ? dropCard() : navigation.goBack())}
          hitSlop={8}
        >
          <ChevronLeft size={22} color={T.text} strokeWidth={2.2} />
        </Pressable>

        <Text style={styles.headerTitle}>Το πορτοφόλι μου</Text>

        {passes.length ? (
          <Text style={styles.headerCount}>
            {passes.filter((p) => p.usable).length} ενεργά
          </Text>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={T.primary} style={styles.loader} />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          // A lifted pass is a modal in all but name; scrolling the stack it
          // came out of underneath it would be nonsense.
          scrollEnabled={!open}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              enabled={!open}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={T.textMuted}
            />
          }
        >
          {passes.length ? (
            <View style={[styles.stack, { height: stackHeight }]}>
              {passes.map((pass, index) => (
                <Pass
                  key={String(pass._id)}
                  pass={pass}
                  index={index}
                  lift={lift}
                  isOpen={String(pass._id) === String(openId)}
                  anyOpen={openIndex >= 0}
                  onPress={() => liftCard(pass)}
                  onClose={dropCard}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={Ticket}
              title="Κανένας κωδικός ακόμα"
              subtitle="Όταν πάρεις μια προσφορά, ο κωδικός σου θα εμφανιστεί εδώ."
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* =========================================================
   One card in the stack.

   Collapsed, only the top PEEK pixels of a card are visible — the card in
   front of it covers the rest. That is the whole trick: nothing is resized or
   re-laid-out when a pass opens, it only slides, so every animation here runs
   on transform and opacity and stays on the native driver.
========================================================= */
function Pass({ pass, index, lift, isOpen, anyOpen, onPress, onClose }) {
  const T = useTheme();
  const styles = useStyles(styleSheet);

  const tint = pass.usable ? tintFor(String(pass.store?._id ?? "")) : SPENT_TINT;

  const stackedY = index * PEEK;
  // The chosen pass rises to the top of the screen; the rest drop out of it.
  const liftedY = isOpen ? 0 : SCREEN_HEIGHT;

  const translateY = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [stackedY, anyOpen ? liftedY : stackedY],
  });

  const opacity = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isOpen || !anyOpen ? 1 : 0],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateY }],
          opacity,
          // A lifted card has to clear every card that was in front of it.
          zIndex: isOpen ? 99 : index,
          elevation: isOpen ? 99 : index,
        },
      ]}
    >
      <LinearGradient
        colors={[tint.from, tint.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardFill}
      >
        <Pressable
          onPress={isOpen ? onClose : onPress}
          style={styles.cardPress}
          // Only the visible strip is tappable when stacked, so a tap always
          // hits the card the user actually pointed at rather than the one
          // underneath whose body happens to extend that far down.
          disabled={anyOpen && !isOpen}
        >
          {/* ---- the strip that shows while stacked ---- */}
          <View style={styles.strip}>
            <Image
              source={{ uri: pass.store?.image }}
              style={styles.stripImage}
            />

            <View style={styles.stripText}>
              <Text style={styles.stripVenue} numberOfLines={1}>
                {pass.store?.name}
              </Text>
              <Text style={styles.stripTitle} numberOfLines={1}>
                {pass.title}
              </Text>
            </View>

            {/* The close button takes this corner once the pass is lifted, so
                the status moves out of its way rather than sitting under it. */}
            {isOpen ? null : pass.redeemed ? (
              <BadgeCheck size={22} color={T.accent} strokeWidth={2.4} />
            ) : pass.usable ? (
              <View style={styles.stripCode}>
                <Text style={styles.stripCodeText}>{pass.code}</Text>
              </View>
            ) : (
              <Text style={styles.stripExpired}>Έληξε</Text>
            )}
          </View>

          {/* ---- the body, hidden behind the next card until this one is
                  lifted out of the stack ---- */}
          <View style={styles.body}>
            {pass.redeemed ? (
              <>
                <View style={styles.verified}>
                  <BadgeCheck size={92} color={T.accent} strokeWidth={2} />
                </View>

                <Text style={styles.verifiedText}>Επιβεβαιώθηκε</Text>
                <Text style={styles.hint}>
                  {pass.redeemedAt
                    ? `Στις ${formatClock(pass.redeemedAt)} · `
                    : ""}
                  Ο κωδικός δεν ισχύει πια.
                </Text>
              </>
            ) : pass.usable ? (
              <>
                {/* White plate behind the code: scanners need the contrast,
                    and the pass is dark everywhere else. */}
                <View style={styles.plate}>
                  <QRCode value={pass.qr} size={168} backgroundColor="#fff" />
                </View>

                <Text style={styles.code}>{pass.code}</Text>
                <Text style={styles.hint}>
                  Δείξε το στην υποδοχή{pass.until ? ` · έως ${pass.until}` : ""}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.verified}>
                  <Ticket size={72} color={T.textFaint} strokeWidth={1.6} />
                </View>
                <Text style={styles.hint}>
                  Η προσφορά έληξε
                  {pass.claimedAt ? ` · την πήρες ${formatTimeAgo(pass.claimedAt)}` : ""}
                </Text>
              </>
            )}
          </View>

          {isOpen ? (
            <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
              <X size={17} color="#fff" strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}
