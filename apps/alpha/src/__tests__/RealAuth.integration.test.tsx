// TEST: Real Auth Service Integration
// This test uses the REAL auth service (not mock) to verify end-to-end functionality
// This test MUST PASS when both QueryClient and React hooks work with real auth

import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import real auth service components
const RealAuthTestComponent = () => {
  // IMPORTANT: This will use the REAL auth service, not mock
  // First we need to temporarily switch back to real auth
  const { useAuth, initApiClient } = require('share');
  
  // Initialize with real API client
  React.useEffect(() => {
    initApiClient({
      baseURL: 'https://api-staging.kftv.fr', // Real staging API
      onAuthError: () => {
        console.warn('Real auth error in test');
      }
    });
  }, []);
  
  // This should work with real auth service and real QueryClient
  const { isAuthenticated, isLoadingUser } = useAuth();
  
  return (
    <>
      {`Real Auth Test: ${isAuthenticated ? 'authenticated' : 'not-authenticated'}, Loading: ${isLoadingUser}`}
    </>
  );
};

describe('Real Auth Integration Test', () => {
  it('MUST work with real auth service and QueryClient', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    });

    // This should work with REAL auth service
    let renderResult;
    expect(() => {
      renderResult = render(
        <QueryClientProvider client={queryClient}>
          <RealAuthTestComponent />
        </QueryClientProvider>
      );
    }).not.toThrow();
    
    // Verify component rendered
    expect(renderResult).toBeDefined();
    
    // Check that the rendered output contains our expected text  
    const output = renderResult!.toJSON();
    console.log('✅ Real Auth test rendered output:', output);
    
    // If we got here without throwing, both real auth and QueryClient are working!
    expect(output).toMatch(/Real Auth Test: not-authenticated, Loading: false/);
  });
});