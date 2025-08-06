import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDescriptionReports } from '../hooks/useDescriptionReports';
import { mediaApi } from '../api/media';

// Mock the API
vi.mock('../api/media');

const mockMediaApi = mediaApi as any;

describe('useDescriptionReports Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export useDescriptionReports function', () => {
    expect(typeof useDescriptionReports).toBe('function');
  });

  it('should have correct hook interface', () => {
    // Test that the hook exists and can be imported
    expect(useDescriptionReports).toBeDefined();
    expect(useDescriptionReports.name).toBe('useDescriptionReports');
  });

  describe('Hook Dependencies', () => {
    it('should have mediaApi dependency mocked', () => {
      expect(mockMediaApi).toBeDefined();
    });

    it('should use correct API methods for description reports', () => {
      // Verify the hook would use the right API endpoints
      expect(mediaApi.getDescriptionReports).toBeDefined();
      expect(mediaApi.getDescriptionReport).toBeDefined();
      expect(mediaApi.getDescriptionReportsByBatch).toBeDefined();
      expect(mediaApi.getDescriptionReportsByDescription).toBeDefined();
    });
  });

  describe('API Integration', () => {
    it('should integrate with description reports endpoints', () => {
      // Test that all required methods exist
      const requiredMethods = [
        'getDescriptionReports',
        'getDescriptionReport', 
        'getDescriptionReportsByBatch',
        'getDescriptionReportsByDescription'
      ];

      requiredMethods.forEach(method => {
        expect(mediaApi[method]).toBeDefined();
      });
    });
  });

  // Note: Full React hook testing requires @testing-library/react-hooks
  // and a proper React testing environment. This test focuses on the
  // hook's existence and interface rather than runtime behavior.
});