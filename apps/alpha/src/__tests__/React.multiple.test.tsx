// STRICT TEST: Detect Multiple React Instances
// This test MUST FAIL if there are multiple React instances causing hook errors
// This test will PASS only when there's truly a single React instance

import React from 'react';
import { render } from '@testing-library/react-native';

const MultipleReactDetectionComponent = () => {
  console.log('[REACT TEST] Testing for multiple React instances...');
  
  // Get React from different potential sources
  const directReact = React;
  const shareReact = require('share').__reactInstance || 'NO_REACT_IN_SHARE';
  
  console.log('[REACT TEST] Direct React:', !!directReact);
  console.log('[REACT TEST] Share React:', shareReact);
  console.log('[REACT TEST] React === React:', React === React);
  console.log('[REACT TEST] React.useEffect:', !!React.useEffect);
  
  try {
    // This useEffect call should work if there's only one React instance
    React.useEffect(() => {
      console.log('[REACT TEST] ✅ useEffect works - single React instance detected');
    }, []);
    
    return <>{`SINGLE_REACT: useEffect works`}</>;
  } catch (error: any) {
    console.log('[REACT TEST] ❌ useEffect failed:', error.message);
    
    if (error.message.includes('useEffect')) {
      return <>{`MULTIPLE_REACT: ${error.message}`}</>;
    }
    
    return <>{`OTHER_REACT_ERROR: ${error.message}`}</>;
  }
};

describe('Multiple React Instance Detection', () => {
  it('MUST detect and FAIL if there are multiple React instances', () => {
    console.log('[REACT TEST] Starting multiple React instance detection...');
    
    let renderResult;
    let didThrowDuringRender = false;
    let renderError: any = null;

    try {
      renderResult = render(<MultipleReactDetectionComponent />);
      console.log('[REACT TEST] Component rendered without throwing');
    } catch (error) {
      didThrowDuringRender = true;
      renderError = error;
      console.log('[REACT TEST] ❌ Component threw during render:', error);
    }

    // Check the rendered output
    const output = renderResult ? renderResult.toJSON() : null;
    console.log('[REACT TEST] Rendered output:', output);

    if (typeof output === 'string') {
      if (output.includes('MULTIPLE_REACT')) {
        console.log('[REACT TEST] ❌ DETECTED multiple React instances!');
        throw new Error(`Multiple React instances detected: ${output}`);
      } else if (output.includes('SINGLE_REACT')) {
        console.log('[REACT TEST] ✅ Single React instance confirmed');
      } else {
        console.log('[REACT TEST] ⚠️ Unexpected output format:', output);
        throw new Error(`Unexpected test output: ${output}`);
      }
    }

    // Final assertions
    expect(didThrowDuringRender).toBe(false);
    expect(output).toMatch(/SINGLE_REACT/);
    expect(output).not.toMatch(/MULTIPLE_REACT/);
  });
});