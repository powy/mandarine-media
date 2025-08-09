// TEST: React Hook Error Detection
// This test MUST FAIL if "Cannot read property 'useContext' of null" error occurs
// This test MUST PASS when React hooks work correctly

import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Test component that uses React hooks like our App component
const ReactHookTestComponent = () => {
  const { useAuth, initApiClient } = require('share');
  
  // Initialize API client like the real app does
  React.useEffect(() => {
    initApiClient({
      baseURL: 'https://api-staging.kftv.fr',
      onAuthError: () => {
        console.warn('Test auth error');
      }
    });
  }, []);
  
  // This should work without "Cannot read property 'useContext' of null"
  const { isAuthenticated, isLoadingUser } = useAuth();
  
  // Test useEffect works (another React hook that was failing)
  React.useEffect(() => {
    console.log('useEffect working in test');
  }, []);
  
  return (
    <>
      {`Hook Test: ${isAuthenticated ? 'authenticated' : 'not-authenticated'}, Loading: ${isLoadingUser}`}
    </>
  );
};

describe('React Hook Error Detection Test', () => {
  it('MUST NOT throw "Cannot read property useContext of null" error', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    });

    // This should NOT throw React hook errors
    let renderResult;
    expect(() => {
      renderResult = render(
        <QueryClientProvider client={queryClient}>
          <ReactHookTestComponent />
        </QueryClientProvider>
      );
    }).not.toThrow();
    
    // Verify component rendered successfully
    expect(renderResult).toBeDefined();
    
    // Check that the rendered output contains our expected text
    const output = renderResult!.toJSON();
    console.log('✅ React Hook test rendered output:', output);
    
    // If we got here without throwing, both React hooks and QueryClient are working!
    expect(output).toMatch(/Hook Test: not-authenticated, Loading: false/);
  });

  it('SHOULD detect when React.useContext is null (the actual error)', () => {
    // Create a scenario that would trigger the useContext null error
    const originalUseContext = React.useContext;
    
    // Mock useContext to return null (simulating the error condition)
    const mockUseContext = jest.fn().mockReturnValue(null);
    (React as any).useContext = mockUseContext;
    
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    });

    try {
      expect(() => {
        render(
          <QueryClientProvider client={queryClient}>
            <ReactHookTestComponent />
          </QueryClientProvider>
        );
      }).toThrow(); // Should throw with null useContext
    } finally {
      // Restore original useContext
      (React as any).useContext = originalUseContext;
    }
  });
});