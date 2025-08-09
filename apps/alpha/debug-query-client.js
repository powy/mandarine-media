// Direct test to check QueryClient setup
import React from 'react';
import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initStorage } from 'share';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Simple test component that tries to use useAuth
const TestApp = () => {
  try {
    const { useAuth } = require('share');
    const { isAuthenticated, isLoadingUser } = useAuth();
    
    return React.createElement('div', {}, 
      `Auth status: ${isAuthenticated ? 'authenticated' : 'not authenticated'}, Loading: ${isLoadingUser}`
    );
  } catch (error) {
    return React.createElement('div', {}, `ERROR: ${error.message}`);
  }
};

// Initialize storage BEFORE any API calls
initStorage(AsyncStorage);

// Create QueryClient with robust configuration
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
const MainApp = () => React.createElement(QueryClientProvider, { client: queryClient }, 
  React.createElement(TestApp)
);

console.log('Registering Alpha app...');
AppRegistry.registerComponent('Alpha', () => MainApp);

export default MainApp;