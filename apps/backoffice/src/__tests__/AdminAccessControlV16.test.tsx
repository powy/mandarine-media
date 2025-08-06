import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as shareModule from 'share';

// Mock all the API functions
vi.mock('share', () => ({
  authApi: {
    login: vi.fn(),
  },
  usersApi: {
    getCurrentUser: vi.fn(),
  },
  initApiClient: vi.fn(),
  getContentLists: vi.fn(),
  getScreenContents: vi.fn(),
  getCategoryLists: vi.fn(),
  getPublicPersons: vi.fn(),
  getUsers: vi.fn(),
  getPrograms: vi.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Admin Access Control - API v1.6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('shows login form when not authenticated', async () => {
    render(<App />);

    expect(screen.getByText('Kyool Backoffice')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('allows admin user to access backoffice', async () => {
    const user = userEvent.setup();

    // Mock successful login
    vi.mocked(shareModule.authApi.login).mockResolvedValue({
      access_token: 'admin-token-123',
      token_type: 'bearer',
    });

    // Mock admin user profile
    vi.mocked(shareModule.usersApi.getCurrentUser).mockResolvedValue({
      id: 1,
      email: 'admin@kyool.com',
      full_name: 'Admin User',
      is_active: true,
      is_admin: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    // Mock empty data for lists
    vi.mocked(shareModule.getContentLists).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
    });

    render(
      <App />
    );

    // Fill in login form
    await user.type(screen.getByLabelText(/email/i), 'admin@kyool.com');
    await user.type(screen.getByLabelText(/password/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(shareModule.authApi.login).toHaveBeenCalledWith({
        email: 'admin@kyool.com',
        password: 'admin123',
      });
      expect(shareModule.usersApi.getCurrentUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Content Lists (v1.6)')).toBeInTheDocument();
      expect(screen.getByText('Screen Contents (v1.6)')).toBeInTheDocument();
    });
  });

  it('denies access to non-admin users', async () => {
    const user = userEvent.setup();

    // Mock successful login
    vi.mocked(shareModule.authApi.login).mockResolvedValue({
      access_token: 'user-token-123',
      token_type: 'bearer',
    });

    // Mock regular user profile (not admin)
    vi.mocked(shareModule.usersApi.getCurrentUser).mockResolvedValue({
      id: 2,
      email: 'user@kyool.com',
      full_name: 'Regular User',
      is_active: true,
      is_admin: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    render(
      <App />
    );

    // Fill in login form
    await user.type(screen.getByLabelText(/email/i), 'user@kyool.com');
    await user.type(screen.getByLabelText(/password/i), 'user123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(shareModule.authApi.login).toHaveBeenCalledWith({
        email: 'user@kyool.com',
        password: 'user123',
      });
      expect(shareModule.usersApi.getCurrentUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Access denied. Administrator privileges required for backoffice access.')).toBeInTheDocument();
      // Should stay on login form
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    // Token should be removed
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
  });

  it('handles authentication errors during user check', async () => {
    const user = userEvent.setup();

    // Mock successful login
    vi.mocked(shareModule.authApi.login).mockResolvedValue({
      access_token: 'invalid-token-123',
      token_type: 'bearer',
    });

    // Mock error when checking user (e.g., token expired)
    vi.mocked(shareModule.usersApi.getCurrentUser).mockRejectedValue({
      response: {
        status: 401,
        data: { detail: 'Token expired' }
      }
    });

    render(
      <App />
    );

    // Fill in login form
    await user.type(screen.getByLabelText(/email/i), 'admin@kyool.com');
    await user.type(screen.getByLabelText(/password/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(shareModule.authApi.login).toHaveBeenCalled();
      expect(shareModule.usersApi.getCurrentUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      // Should stay on login form
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    // Token should be removed
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
  });

  it('checks user role on app startup if token exists', async () => {
    // Mock existing token
    mockLocalStorage.getItem.mockReturnValue('existing-token');

    // Mock admin user profile
    vi.mocked(shareModule.usersApi.getCurrentUser).mockResolvedValue({
      id: 1,
      email: 'admin@kyool.com',
      full_name: 'Admin User',
      is_active: true,
      is_admin: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    // Mock empty data for lists
    vi.mocked(shareModule.getContentLists).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
    });

    render(
      <App />
    );

    await waitFor(() => {
      expect(shareModule.usersApi.getCurrentUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('logs out user and clears token', async () => {
    const user = userEvent.setup();

    // Mock existing admin session
    mockLocalStorage.getItem.mockReturnValue('admin-token');
    vi.mocked(shareModule.usersApi.getCurrentUser).mockResolvedValue({
      id: 1,
      email: 'admin@kyool.com',
      full_name: 'Admin User',
      is_active: true,
      is_admin: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    // Mock empty data for lists
    vi.mocked(shareModule.getContentLists).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
    });

    // Mock reload functionality
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <App />
    );

    await waitFor(() => {
      expect(screen.getByText('Kyool Media Backoffice')).toBeInTheDocument();
    });

    // Click logout button
    await user.click(screen.getByText('Logout'));

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
    expect(mockReload).toHaveBeenCalled();
  });

  it('displays v1.6 navigation items only for admins', async () => {
    // Mock existing admin session
    mockLocalStorage.getItem.mockReturnValue('admin-token');
    vi.mocked(shareModule.usersApi.getCurrentUser).mockResolvedValue({
      id: 1,
      email: 'admin@kyool.com',
      full_name: 'Admin User',
      is_active: true,
      is_admin: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    // Mock empty data for lists
    vi.mocked(shareModule.getContentLists).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
    });

    render(
      <App />
    );

    await waitFor(() => {
      // Check that v1.6 specific navigation items are present
      expect(screen.getByText('Content Lists (v1.6)')).toBeInTheDocument();
      expect(screen.getByText('Screen Contents (v1.6)')).toBeInTheDocument();
      
      // Check other navigation items are present
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Public Persons')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Programs')).toBeInTheDocument();
    });
  });

  it('shows loading spinner during authentication check', async () => {
    // Mock existing token
    mockLocalStorage.getItem.mockReturnValue('existing-token');

    // Make the API call take a long time
    vi.mocked(shareModule.usersApi.getCurrentUser).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        id: 1,
        email: 'admin@kyool.com',
        full_name: 'Admin User',
        is_active: true,
        is_admin: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }), 100))
    );

    render(
      <App />
    );

    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(shareModule.usersApi.getCurrentUser).toHaveBeenCalled();
    });
  });

  it('handles login form errors', async () => {
    const user = userEvent.setup();

    // Mock login failure
    vi.mocked(shareModule.authApi.login).mockRejectedValue({
      response: {
        data: {
          detail: 'Invalid credentials'
        }
      }
    });

    render(
      <App />
    );

    // Fill in login form with invalid credentials
    await user.type(screen.getByLabelText(/email/i), 'wrong@kyool.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    // Should stay on login form
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});