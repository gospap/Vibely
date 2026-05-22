import { useRef, useEffect } from "react";
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
import { BlurView } from "expo-blur";
import { House, CalendarDays, Users, User } from "lucide-react-native";

import HomeScreen from "@/screens/HomeScreen/HomeScreen";
import EventsScreen from "@/screens/EventsScreen/EventsScreen";
import CommunityScreen from "@/screens/CommunityScreen/CommunityScreen";
import ProfileScreen from "@/screens/ProfileScreen/ProfileScreen";

const Tab = createBottomTabNavigator();
const TABS = [
  { name: "Home", label: "Χάρτης", Icon: House },
  { name: "Events", label: "Events", Icon: CalendarDays },
  { name: "Community", label: "Κοινότητα", Icon: Users },
  { name: "Profile", label: "Προφίλ", Icon: User },
];

function LiquidGlassTabBar({ state, descriptors, navigation }) {
  const tabLayouts = useRef({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(60)).current;
  const scales = useRef(TABS.map(() => new Animated.Value(1))).current;

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
          const { Icon, label } = TABS[index];

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
    height: 70,
    borderRadius: 35,
    paddingHorizontal: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
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
    borderRadius: 27,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 10,
    height: 54,
    borderRadius: 27,
  },

  label: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.2,
  },
  labelActive: {
    color: "#ffffff",
  },
});

export default function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        contentStyle: { paddingBottom: 110 },
      }}
    >
      {TABS.map(({ name }) => {
        const screens = {
          Home: HomeScreen,
          Events: EventsScreen,
          Community: CommunityScreen,
          Profile: ProfileScreen,
        };
        return <Tab.Screen key={name} name={name} component={screens[name]} />;
      })}
    </Tab.Navigator>
  );
}
