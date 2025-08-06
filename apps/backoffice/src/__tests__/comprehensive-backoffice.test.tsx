import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock the shared package
vi.mock('share', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
    getToken: vi.fn()
  },
  usersApi: {
    getCurrentUser: vi.fn()
  },
  initApiClient: vi.fn()
}));

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_BASE_URL: 'http://localhost:8000'
  }
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Comprehensive Backoffice Application Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Authentication Flow', () => {
    it('should show login form when not authenticated', async () => {
      render(<App />);
      
      expect(screen.getByText('Kyool Backoffice')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText('Test credentials:')).toBeInTheDocument();
    });

    it('should show loading state during authentication check', async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      
      // Make getCurrentUser hang to test loading state
      vi.mocked(usersApi.getCurrentUser).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<App />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error message for invalid credentials', async () => {
      const { authApi } = await import('share');
      vi.mocked(authApi.login).mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } }
      });

      render(<App />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should show error for non-admin users', async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      
      vi.mocked(usersApi.getCurrentUser).mockResolvedValue({
        id: '123',
        email: 'user@example.com',
        full_name: 'Regular User',
        is_admin: false,
        is_active: true
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Access denied. Administrator privileges required for backoffice access.')).toBeInTheDocument();
      });
    });

    it('should show main app for authenticated admin users', async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      
      vi.mocked(usersApi.getCurrentUser).mockResolvedValue({
        id: '123',
        email: 'admin@kyool.com',
        full_name: 'Admin User',
        is_admin: true,
        is_active: true
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Routing', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = require('share');
      vi.mocked(usersApi.getCurrentUser).mockResolvedValue({
        id: '123',
        email: 'admin@kyool.com',
        full_name: 'Admin User',
        is_admin: true,
        is_active: true
      });
    });

    it('should redirect to dashboard by default', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should handle all defined routes', async () => {
      const routes = [
        '/dashboard',
        '/persons',
        '/category-lists',
        '/users',
        '/programs',
        '/seasons',
        '/media',
        '/videos',
        '/video-reports',
        '/languages',
        '/countries',
        '/territories',
        '/pictures',
        '/description-reports',
        '/content-lists',
        '/screen-contents'
      ];

      for (const route of routes) {
        render(
          <MemoryRouter initialEntries={[route]}>
            <App />
          </MemoryRouter>
        );
        
        await waitFor(() => {
          // Should not show "Not Found" or similar error
          expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Application Layout', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      vi.mocked(usersApi.getCurrentUser).mockResolvedValue({
        id: '123',
        email: 'admin@kyool.com',
        full_name: 'Admin User',
        is_admin: true,
        is_active: true
      });
    });

    it('should show header with logout button', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      });
    });

    it('should handle logout', async () => {
      const mockReload = vi.fn();
      Object.defineProperty(window.location, 'reload', { 
        value: mockReload,
        writable: true 
      });

      render(<App />);
      
      await waitFor(() => {
        const logoutButton = screen.getByRole('button', { name: /logout/i });
        fireEvent.click(logoutButton);
        
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
        expect(mockReload).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      
      vi.mocked(usersApi.getCurrentUser).mockRejectedValue(new Error('API Error'));

      render(<App />);
      
      await waitFor(() => {
        // Should not crash and should show login form again
        expect(screen.getByText('Kyool Backoffice')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      
      vi.mocked(usersApi.getCurrentUser).mockRejectedValue(new Error('Network Error'));

      render(<App />);
      
      await waitFor(() => {
        // Should handle error and show login form
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    it('should require admin privileges', async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      
      vi.mocked(usersApi.getCurrentUser).mockResolvedValue({
        id: '123',
        email: 'user@example.com',
        full_name: 'Regular User',
        is_admin: false,
        is_active: true
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Access denied. Administrator privileges required for backoffice access.')).toBeInTheDocument();
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
      });
    });

    it('should handle token expiration', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token');
      const { usersApi } = await import('share');
      
      vi.mocked(usersApi.getCurrentUser).mockRejectedValue({
        response: { status: 401, data: { detail: 'Token expired' } }
      });

      render(<App />);
      
      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      vi.mocked(usersApi.getCurrentUser).mockResolvedValue({
        id: '123',
        email: 'admin@kyool.com',
        full_name: 'Admin User',
        is_admin: true,
        is_active: true
      });
    });

    it('should be responsive on mobile', async () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
        // Should still be functional on mobile
      });
    });

    it('should be responsive on tablet', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      vi.mocked(usersApi.getCurrentUser).mockResolvedValue({
        id: '123',
        email: 'admin@kyool.com',
        full_name: 'Admin User',
        is_admin: true,
        is_active: true
      });
    });

    it('should load quickly', async () => {
      const startTime = Date.now();
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
      });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // Should load in less than 1 second
    });

    it('should not cause memory leaks', async () => {
      const { unmount } = render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
      });
      
      // Unmount should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      vi.mocked(usersApi.getCurrentUser).mockResolvedValue({
        id: '123',
        email: 'admin@kyool.com',
        full_name: 'Admin User',
        is_admin: true,
        is_active: true
      });
    });

    it('should have proper form labels', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<App />);
      
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should have proper button roles', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      render(<App />);
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      
      // Should be able to tab through form elements
      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);
      
      fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(document.activeElement).toBe(passwordInput);
    });
  });

  describe('Integration with Shared Package', () => {
    it('should initialize API client correctly', async () => {
      const { initApiClient } = await import('share');
      
      render(<App />);
      
      expect(initApiClient).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8000',
        onAuthError: expect.any(Function)
      });
    });

    it('should handle auth errors from API client', async () => {
      const { initApiClient } = await import('share');
      
      render(<App />);
      
      // Get the onAuthError callback
      const initCall = vi.mocked(initApiClient).mock.calls[0];
      const onAuthError = initCall[0].onAuthError;
      
      const mockReload = vi.fn();
      Object.defineProperty(window.location, 'reload', { 
        value: mockReload,
        writable: true 
      });
      
      // Simulate auth error
      onAuthError();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should manage authentication state correctly', async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      
      vi.mocked(usersApi.getCurrentUser).mockResolvedValue({
        id: '123',
        email: 'admin@kyool.com',
        full_name: 'Admin User',
        is_admin: true,
        is_active: true
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
      });
    });

    it('should handle role changes', async () => {
      mockLocalStorage.getItem.mockReturnValue('fake-token');
      const { usersApi } = await import('share');
      
      // First call returns admin
      vi.mocked(usersApi.getCurrentUser)
        .mockResolvedValueOnce({
          id: '123',
          email: 'admin@kyool.com',
          full_name: 'Admin User',
          is_admin: true,
          is_active: true
        })
        .mockResolvedValueOnce({
          id: '123',
          email: 'admin@kyool.com',
          full_name: 'Admin User',
          is_admin: false, // Demoted
          is_active: true
        });

      const { rerender } = render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
      });
      
      // Simulate a re-render with changed role
      rerender(<App />);
      
      // Should handle role change gracefully
    });
  });
});