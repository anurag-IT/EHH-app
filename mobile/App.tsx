import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import RootNavigation from './src/navigation';
import { StatusBar } from 'expo-status-bar';

function AppInner() {
  const { user } = useAuth();
  return (
    <SocketProvider userId={user?.id}>
      <RootNavigation />
    </SocketProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppInner />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
