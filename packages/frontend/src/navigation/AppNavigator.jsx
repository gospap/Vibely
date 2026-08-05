import { useContext, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import {
  House,
  CalendarDays,
  Users,
  User,
  Store,
  CalendarCheck,
} from "lucide-react-native";

import HomeScreen from "@/pages/HomeScreen";
import EventsScreen from "@/pages/EventsScreen";
import CommunityScreen from "@/pages/CommunityScreen";
import ChatScreen from "@/pages/ChatScreen";
import UserProfileScreen from "@/pages/UserProfileScreen";
import ProfileScreen from "@/pages/ProfileScreen";
import MyBookingsScreen from "@/pages/MyBookingsScreen";
import VenueScreen from "@/pages/VenueScreen";
import VenueReservationsScreen from "@/pages/VenueReservationsScreen";
import VenueAnalyticsScreen from "@/pages/VenueAnalyticsScreen";
import WalletScreen from "@/pages/WalletScreen";
import { AuthContext } from "@/context/AuthContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const TABS = [
  { name: "Home", label: "Χάρτης", Icon: House },
  { name: "Events", label: "Events", Icon: CalendarDays },
  { name: "Community", label: "Κοινότητα", Icon: Users },
  { name: "Profile", label: "Προφίλ", Icon: User },
];

// A venue account opens on its own night sheet instead of the map — it is
// running a business here, not looking for one. Community is swapped for the
// booking book: a venue needs the thing that pays it, not a friends feed.
const TENANT_TABS = [
  { name: "Venue", label: "Μαγαζί", Icon: Store },
  { name: "Reservations", label: "Κρατήσεις", Icon: CalendarCheck },
  { name: "Events", label: "Events", Icon: CalendarDays },
  { name: "Profile", label: "Προφίλ", Icon: User },
];

const SCREENS = {
  Home: HomeScreen,
  Venue: VenueScreen,
  Reservations: VenueReservationsScreen,
  Events: EventsScreen,
  Community: CommunityScreen,
  Profile: ProfileScreen,
};

function LiquidGlassTabBar({ state, navigation, tabs }) {
  const tabLayouts = useRef({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(60)).current;
  const scales = useRef(tabs.map(() => new Animated.Value(1))).current;

  const animatePill = (x, w) => {
    Animated.parallel([
      Animated.spring(pillX, {
        toValue: x,
        useNativeDriver: false,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
      }),
      Animated.spring(pillW, {
        toValue: w,
        useNativeDriver: false,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
      }),
    ]).start();
  };

  const onTabLayout = (index, event) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.current[index] = { x, width };
    // Αρχικοποίηση στο πρώτο tab
    if (index === 0 && state.index === 0) {
      pillX.setValue(x);
      pillW.setValue(width);
    }
  };

  const onPress = (index, route, isFocused) => {
    const layout = tabLayouts.current[index];
    if (layout) animatePill(layout.x, layout.width);

    Animated.sequence([
      Animated.timing(scales[index], {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scales[index], {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 10,
      }),
    ]).start();

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  // Slide στο σωστό tab αν αλλάξει το state εξωτερικά (πχ. deep link)
  useEffect(() => {
    const layout = tabLayouts.current[state.index];
    if (layout) animatePill(layout.x, layout.width);
  }, [state.index]);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <BlurView intensity={60} tint="dark" style={styles.bar}>
        <View style={styles.glassOverlay} />

        {/* Sliding pill — rendered UNDER the tabs */}
        <Animated.View style={[styles.pill, { left: pillX, width: pillW }]}>
          <BlurView
            intensity={40}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { Icon, label } = tabs[index];

          return (
            <Animated.View
              key={route.key}
              style={[
                styles.tabWrap,
                { transform: [{ scale: scales[index] }] },
              ]}
              onLayout={(e) => onTabLayout(index, e)}
            >
              <TouchableOpacity
                onPress={() => onPress(index, route, isFocused)}
                activeOpacity={0.8}
                style={styles.tabItem}
              >
                <Icon
                  size={22}
                  color={isFocused ? "#ffffff" : "rgba(255,255,255,0.4)"}
                  strokeWidth={isFocused ? 2.2 : 1.7}
                />
                <Text style={[styles.label, isFocused && styles.labelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: Dimensions.get("window").width - 24,
    height: 74,
    borderRadius: 28,
    paddingHorizontal: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(10, 15, 28, 0.45)",
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.16)",
    borderRadius: 35,
    pointerEvents: "none",
  },
  tabWrap: {
    flex: 1,
    alignItems: "center",
  },
  pill: {
    position: "absolute",
    top: "50%",
    marginTop: -27,
    height: 54,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    height: 54,
    borderRadius: 22,
  },

  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.62)",
    letterSpacing: 0.2,
  },
  labelActive: {
    color: "#ffffff",
  },
});

function TabsNavigator() {
  const { user } = useContext(AuthContext);
  const tabs = user?.type === "tenant" ? TENANT_TABS : TABS;

  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} tabs={tabs} />}
      screenOptions={{
        headerShown: false,
        contentStyle: { paddingBottom: 110 },
      }}
    >
      {tabs.map(({ name }) => (
        <Tab.Screen key={name} name={name} component={SCREENS[name]} />
      ))}
    </Tab.Navigator>
  );
}

// The tabs live inside a stack so a chat thread or someone's profile can be
// pushed over them full screen, the way Instagram does it.
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabsNavigator} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
      <Stack.Screen name="VenueAnalytics" component={VenueAnalyticsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
    </Stack.Navigator>
  );
}
