import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initApiClient, useAuth } from 'share';
import { LoginScreen } from './screens/LoginScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { DebugGetScreen } from './screens/DebugGetScreen';
import { ContentScreen } from './screens/ContentScreen';
import { VideoScreen } from './screens/VideoScreen';
import { ErrorScreen } from './screens/ErrorScreen';
import { currentConfig } from '../config';
import type { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const { isAuthenticated, isLoadingUser } = useAuth();

  useEffect(() => {
    // Initialize API client
    // v1.9: Updated to include /api/v1 in base URL as per OpenAPI spec
    initApiClient({
      baseURL: `${currentConfig.apiBaseUrl}/api/v1`,
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

  
  // Show main app with navigation available to all users
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="Content"
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="DebugGet" component={DebugGetScreen} />
        <Stack.Screen name="Content" component={ContentScreen} />
        <Stack.Screen name="Video" component={VideoScreen} />
        <Stack.Screen name="Error" component={ErrorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
});

export default App;


