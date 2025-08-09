// TEMPORARILY SIMPLIFIED FOR TESTING QUERYCLIENT FIX
// This version tests the QueryClient context sharing with mock auth
// Original auth-dependent logic is commented below

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initApiClient, useAuth } from 'share';
import { LoginScreen } from './screens/LoginScreen';
import { DebugGetScreen } from './screens/DebugGetScreen';
import { currentConfig } from '../config';

const App: React.FC = () => {
  const { isAuthenticated, isLoadingUser } = useAuth();

  useEffect(() => {
    // Initialize API client
    initApiClient({
      baseURL: currentConfig.apiBaseUrl,
      onAuthError: () => {
        console.warn('Authentication failed. Please check your credentials.');
      }
    });
  }, []);

  // Show loading spinner while checking authentication
  if (isLoadingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  // Show main app if authenticated
  return <DebugGetScreen />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default App;