// STRICT TEST: This test MUST catch the actual QueryClient error
// This test will FAIL if "No QueryClient set, use QueryClientProvider to set one" occurs
// This test will PASS only when QueryClient context sharing works correctly

import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const StrictQueryClientTestComponent = () => {
  const { useAuth, initApiClient } = require('share');
  
  // Initialize API client exactly like the real app
  React.useEffect(() => {
    initApiClient({
      baseURL: 'https://api-staging.kftv.fr',
      onAuthError: () => {
        console.warn('Auth error in strict test');
      }
    });
  }, []);
  
  console.log('[STRICT TEST] About to call useAuth - this is where QueryClient error happens');
  
  try {
    // This is where "No QueryClient set" error occurs if context sharing is broken
    const { isAuthenticated, isLoadingUser } = useAuth();
    console.log('[STRICT TEST] ✅ useAuth succeeded:', { isAuthenticated, isLoadingUser });
    return <>{`QUERY_SUCCESS: auth=${isAuthenticated}, loading=${isLoadingUser}`}</>;
  } catch (error: any) {
    console.log('[STRICT TEST] ❌ useAuth failed with error:', error.message);
    if (error.message.includes('No QueryClient set')) {
      return <>{`QUERY_CONTEXT_ERROR: ${error.message}`}</>;
    }
    return <>{`OTHER_ERROR: ${error.message}`}</>;
  }
};

describe('QueryClient Context Strict Test', () => {
  it('MUST NOT throw QueryClient context error - FAIL if it does', () => {
    console.log('[STRICT TEST] Starting QueryClient context test...');
    
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    });

    console.log('[STRICT TEST] Created QueryClient, about to render with QueryClientProvider...');

    let renderResult;
    let didThrowDuringRender = false;
    let renderError: any = null;

    try {
      renderResult = render(
        <QueryClientProvider client={queryClient}>
          <StrictQueryClientTestComponent />
        </QueryClientProvider>
      );
      console.log('[STRICT TEST] Component rendered without throwing');
    } catch (error) {
      didThrowDuringRender = true;
      renderError = error;
      console.log('[STRICT TEST] ❌ Component threw during render:', error);
    }

    // First check: rendering should not throw
    expect(didThrowDuringRender).toBe(false);
    expect(renderResult).toBeDefined();

    // Second check: examine the rendered output
    const output = renderResult!.toJSON();
    console.log('[STRICT TEST] Rendered output:', output);

    // Third check: output should show success, not QueryClient error
    if (typeof output === 'string') {
      if (output.includes('QUERY_CONTEXT_ERROR')) {
        console.log('[STRICT TEST] ❌ DETECTED QueryClient context error in output');
        throw new Error(`QueryClient context sharing is broken: ${output}`);
      } else if (output.includes('QUERY_SUCCESS')) {
        console.log('[STRICT TEST] ✅ QueryClient context sharing works correctly');
      } else {
        console.log('[STRICT TEST] ⚠️ Unexpected output format:', output);
        throw new Error(`Unexpected test output: ${output}`);
      }
    }

    // Final assertion: output should contain success message
    expect(output).toMatch(/QUERY_SUCCESS/);
    expect(output).not.toMatch(/QUERY_CONTEXT_ERROR/);
  });
});