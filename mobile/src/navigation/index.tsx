import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import { 
  Home, 
  PlusSquare, 
  User, 
  Search, 
  MessageCircle, 
  Bell,
  CheckCircle2
} from "lucide-react-native";

import LoginScreen from "../screens/LoginScreen";
import FeedScreen from "../screens/FeedScreen";
import UploadScreen from "../screens/UploadScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AdminScreen from "../screens/AdminScreen";
import SearchScreen from "../screens/SearchScreen";
import SplashScreen from "../screens/SplashScreen";
import StoryCreatorScreen from "../screens/StoryCreatorScreen";
import MessagingScreen from "../screens/MessagingScreen";
import ChatScreen from "../screens/ChatScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import PostDetailScreen from "../screens/PostDetailScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      id="mainTabs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 90,
          paddingBottom: 30,
          paddingTop: 12,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 10
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.slate100,
        tabBarShowLabel: false,
        tabBarIcon: ({ color, size, focused }) => {
          const iconSize = focused ? 28 : 24;
          if (route.name === "Feed") return <Home color={focused ? colors.primary : colors.textMuted} size={iconSize} />;
          if (route.name === "Search") return <Search color={focused ? colors.primary : colors.textMuted} size={iconSize} />;
          if (route.name === "Upload") return <PlusSquare color={focused ? colors.primary : colors.textMuted} size={32} />;
          if (route.name === "Messages") return <MessageCircle color={focused ? colors.primary : colors.textMuted} size={iconSize} />;
          if (route.name === "Profile") return <User color={focused ? colors.primary : colors.textMuted} size={iconSize} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Messages" component={MessagingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator id="authStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigation() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return (
      <SplashScreen
        authLoading={loading}
        onAuthReady={() => setSplashDone(true)}
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={user ? MainTabs : AuthStack} />
        {user && (
          <>
            <Stack.Screen 
              name="StoryCreator" 
              component={StoryCreatorScreen} 
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} 
            />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
