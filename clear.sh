#!/bin/bash

# =====================================================
# CLEAN EXPO + REACT NATIVE ENTERPRISE SETUP
# JSX + STYLES.JS + BOTTOM TABS
# =====================================================

cd packages/frontend || exit

echo "🚀 Cleaning old Expo Router..."

# =====================================================
# REMOVE EXPO ROUTER + TYPESCRIPT
# =====================================================

npm remove expo-router typescript @types/react @types/react-native

rm -rf app
rm -f tsconfig.json

# =====================================================
# INSTALL NAVIGATION
# =====================================================

echo "📦 Installing navigation..."

npm install @react-navigation/native
npm install @react-navigation/bottom-tabs
npm install @react-navigation/native-stack

# Expo native deps
npx expo install react-native-screens
npx expo install react-native-safe-area-context
npx expo install react-native-gesture-handler
npx expo install react-native-reanimated
npx expo install react-native-svg

# =====================================================
# INSTALL UI + ICONS
# =====================================================

echo "📦 Installing UI..."

npm install lucide-react-native
npm install nativewind
npm install clsx tailwind-merge
npm install class-variance-authority
npm install axios

npm install babel-plugin-module-resolver

# =====================================================
# CREATE STRUCTURE
# =====================================================

echo "📁 Creating folders..."

mkdir -p src/components/ui/Button
mkdir -p src/components/layout/MainLayout
mkdir -p src/components/navigation/BottomTabs

mkdir -p src/screens/HomeScreen
mkdir -p src/screens/EventsScreen
mkdir -p src/screens/CommunityScreen
mkdir -p src/screens/ProfileScreen

mkdir -p src/navigation

mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/store
mkdir -p src/utils
mkdir -p src/constants
mkdir -p src/assets

# =====================================================
# ENTRY FILES
# =====================================================

touch src/index.js
touch src/App.jsx

# =====================================================
# NAVIGATION FILES
# =====================================================

touch src/navigation/AppNavigator.jsx

# =====================================================
# COMPONENT FILES
# =====================================================

touch src/components/navigation/BottomTabs/BottomTabs.jsx
touch src/components/navigation/BottomTabs/BottomTabs.styles.js

touch src/components/layout/MainLayout/MainLayout.jsx
touch src/components/layout/MainLayout/MainLayout.styles.js

touch src/components/ui/Button/Button.jsx
touch src/components/ui/Button/Button.styles.js

# =====================================================
# SCREEN FILES
# =====================================================

touch src/screens/HomeScreen/HomeScreen.jsx
touch src/screens/HomeScreen/HomeScreen.styles.js

touch src/screens/EventsScreen/EventsScreen.jsx
touch src/screens/EventsScreen/EventsScreen.styles.js

touch src/screens/CommunityScreen/CommunityScreen.jsx
touch src/screens/CommunityScreen/CommunityScreen.styles.js

touch src/screens/ProfileScreen/ProfileScreen.jsx
touch src/screens/ProfileScreen/ProfileScreen.styles.js

# =====================================================
# SERVICES
# =====================================================

touch src/services/api.js

# =====================================================
# BABEL CONFIG
# =====================================================

cat > babel.config.js << 'EOF'
module.exports = function(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
EOF

# =====================================================
# INDEX.JS
# =====================================================

cat > src/index.js << 'EOF'
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
EOF

# =====================================================
# APP.JSX
# =====================================================

cat > src/App.jsx << 'EOF'
import { NavigationContainer } from '@react-navigation/native';

import AppNavigator from '@/navigation/AppNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
EOF

# =====================================================
# NAVIGATOR
# =====================================================

cat > src/navigation/AppNavigator.jsx << 'EOF'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import {
  House,
  CalendarDays,
  Users,
  User,
} from 'lucide-react-native';

import HomeScreen from '@/screens/HomeScreen/HomeScreen';
import EventsScreen from '@/screens/EventsScreen/EventsScreen';
import CommunityScreen from '@/screens/CommunityScreen/CommunityScreen';
import ProfileScreen from '@/screens/ProfileScreen/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <House color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
EOF

# =====================================================
# HOME SCREEN
# =====================================================

cat > src/screens/HomeScreen/HomeScreen.jsx << 'EOF'
import { View, Text } from 'react-native';

import styles from './HomeScreen.styles';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Home Screen
      </Text>
    </View>
  );
}
EOF

cat > src/screens/HomeScreen/HomeScreen.styles.js << 'EOF'
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
EOF

# =====================================================
# EVENTS SCREEN
# =====================================================

cat > src/screens/EventsScreen/EventsScreen.jsx << 'EOF'
import { View, Text } from 'react-native';

import styles from './EventsScreen.styles';

export default function EventsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Events Screen
      </Text>
    </View>
  );
}
EOF

cat > src/screens/EventsScreen/EventsScreen.styles.js << 'EOF'
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
EOF

# =====================================================
# COMMUNITY SCREEN
# =====================================================

cat > src/screens/CommunityScreen/CommunityScreen.jsx << 'EOF'
import { View, Text } from 'react-native';

import styles from './CommunityScreen.styles';

export default function CommunityScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Community Screen
      </Text>
    </View>
  );
}
EOF

cat > src/screens/CommunityScreen/CommunityScreen.styles.js << 'EOF'
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
EOF

# =====================================================
# PROFILE SCREEN
# =====================================================

cat > src/screens/ProfileScreen/ProfileScreen.jsx << 'EOF'
import { View, Text } from 'react-native';

import styles from './ProfileScreen.styles';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Profile Screen
      </Text>
    </View>
  );
}
EOF

cat > src/screens/ProfileScreen/ProfileScreen.styles.js << 'EOF'
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
EOF

# =====================================================
# API SERVICE
# =====================================================

cat > src/services/api.js << 'EOF'
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});
EOF

# =====================================================
# PACKAGE.JSON ENTRY FIX
# =====================================================

node -e "
const fs = require('fs');
const pkg = require('./package.json');

pkg.main = 'src/index.js';

fs.writeFileSync(
  './package.json',
  JSON.stringify(pkg, null, 2)
);
"

# =====================================================
# START CLEAN
# =====================================================

echo "✅ Setup completed!"
echo "🚀 Starting Expo..."

npx expo start --clear