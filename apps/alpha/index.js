// index.js
/**
 * Alpha React Native App Entry Point
 */

import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initStorage, initAuthStorage, NativeAuthStorage } from 'share';
import App from './src/App';

// Initialize legacy storage for backward compatibility
initStorage(AsyncStorage);

// Initialize enhanced auth storage system for React Native
const nativeAuthStorage = new NativeAuthStorage(AsyncStorage);
initAuthStorage(nativeAuthStorage);

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create QueryClient with more robust configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Main App component wrapper
const MainApp = () => (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

AppRegistry.registerComponent('Alpha', () => MainApp);
