// TEST: Capture exact error from useAuth
// This test will show us exactly what error useAuth is throwing

import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const UseAuthErrorCaptureComponent = () => {
  const { useAuth, initApiClient } = require('share');
  
  // Initialize API client
  React.useEffect(() => {
    initApiClient({
      baseURL: 'https://api-staging.kftv.fr',
      onAuthError: () => {
        console.warn('Auth error in test');
      }
    });
  }, []);
  
  try {
    const { isAuthenticated, isLoadingUser } = useAuth();
    return <>{`SUCCESS: ${isAuthenticated ? 'authenticated' : 'not-authenticated'}, Loading: ${isLoadingUser}`}</>;
  } catch (error: any) {
    return <>{`ERROR: ${error.message || 'Unknown error'}`}</>;
  }
};

describe('UseAuth Error Capture Test', () => {
  it('Should capture the exact error useAuth is throwing', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    });

    const renderResult = render(
      <QueryClientProvider client={queryClient}>
        <UseAuthErrorCaptureComponent />
      </QueryClientProvider>
    );
    
    // This will show us either "SUCCESS:" or "ERROR:" message
    console.log('Rendered output:', renderResult.toJSON());
    
    // Check if we got success or error
    const { getByText } = renderResult;
    
    try {
      getByText(/SUCCESS:/);
      console.log('✅ useAuth is working!');
    } catch (e) {
      try {
        getByText(/ERROR:/);
        console.log('❌ useAuth threw an error - check the rendered output above');
      } catch (e2) {
        console.log('❌ Neither SUCCESS nor ERROR found - component may not be rendering text');
      }
    }
    
    expect(renderResult).toBeDefined();
  });
});