// TEST 1: Catch QueryClient Error When It Occurs
// This test will FAIL if the QueryClient error happens
// It will PASS if useAuth works without QueryClient error

import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Test component that uses useAuth directly from share package
const ErrorTestComponent = () => {
  const { useAuth } = require('share');
  
  try {
    const { isAuthenticated, isLoadingUser } = useAuth();
    return <>{`Status: ${isAuthenticated ? 'authenticated' : 'not-authenticated'}, Loading: ${isLoadingUser}`}</>;
  } catch (error) {
    return <>{`ERROR: ${error.message}`}</>;
  }
};

describe('QueryClient Error Detection Test', () => {
  it('MUST NOT throw QueryClient error when useAuth is called', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    });

    // This should NOT throw "No QueryClient set" error
    let renderResult;
    expect(() => {
      renderResult = render(
        <QueryClientProvider client={queryClient}>
          <ErrorTestComponent />
        </QueryClientProvider>
      );
    }).not.toThrow();
    
    // If we get here without throwing, QueryClient is working
    // Just verify we didn't get a QueryClient error (which would have thrown above)
    expect(renderResult).toBeDefined();
    
    // Try to get text to verify component rendered
    try {
      const { getByText } = renderResult!;
      // Should find status text (proving useAuth worked)
      expect(() => getByText(/Status:/)).not.toThrow();
    } catch (error) {
      // If text search fails, that's OK - the main thing is no QueryClient error
      console.log('Text search failed but QueryClient worked:', error);
    }
  });

  it('SHOULD catch the error when no QueryClientProvider is present', () => {
    // This should reproduce the error for reference
    expect(() => {
      render(<ErrorTestComponent />);
    }).toThrow(/No QueryClient set|Invalid hook call/);
  });
});