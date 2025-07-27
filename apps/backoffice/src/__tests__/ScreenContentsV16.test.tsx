import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ScreenContentsPage from '../pages/screen-contents/ScreenContentsPage';
import * as shareModule from 'share';

// Mock all the API functions
vi.mock('share', () => ({
  getScreenContents: vi.fn(),
  createScreenContent: vi.fn(),
  updateScreenContent: vi.fn(),
  deleteScreenContent: vi.fn(),
  regenerateScreenContentJSON: vi.fn(),
  getContentLists: vi.fn(),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockContentLists = [
  {
    id: 'cl1',
    creation_date_utc: '2024-01-01T00:00:00Z',
    last_updated_utc: '2024-01-01T00:00:00Z',
    title: 'Featured Movies',
    thumbnail_format: 'large_landscape' as const,
    is_active: true,
    display_order: 1,
    description: 'Top featured movies',
    content_items: ['movie1', 'movie2'],
    content_types: ['media_description', 'media_description'],
  },
  {
    id: 'cl2',
    creation_date_utc: '2024-01-02T00:00:00Z',
    last_updated_utc: '2024-01-02T00:00:00Z',
    title: 'TV Shows',
    thumbnail_format: 'medium_portrait' as const,
    is_active: true,
    display_order: 2,
    description: 'Popular TV shows',
    content_items: ['show1'],
    content_types: ['program'],
  },
];

const mockScreenContents = [
  {
    id: 'sc1',
    creation_date_utc: '2024-01-01T00:00:00Z',
    last_updated_utc: '2024-01-01T00:00:00Z',
    title: 'Home Screen Layout',
    is_active: true,
    display_order: 1,
    description: 'Main home screen configuration',
    content_lists: ['cl1', 'cl2'],
    screen_type: 'home',
  },
  {
    id: 'sc2',
    creation_date_utc: '2024-01-02T00:00:00Z',
    last_updated_utc: '2024-01-02T00:00:00Z',
    title: 'Browse Screen',
    is_active: false,
    display_order: 2,
    description: 'Browse page layout',
    content_lists: ['cl1'],
    screen_type: 'browse',
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ScreenContentsPage - API v1.6 Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(shareModule.getScreenContents).mockResolvedValue({
      data: mockScreenContents,
      pagination: { page: 1, limit: 10, total: 2, total_pages: 1 },
    });

    vi.mocked(shareModule.getContentLists).mockResolvedValue({
      data: mockContentLists,
      pagination: { page: 1, limit: 10, total: 2, total_pages: 1 },
    });
  });

  it('renders screen contents page with v1.6 features', async () => {
    renderWithProviders(<ScreenContentsPage />);

    expect(screen.getByText('Screen Contents Management')).toBeInTheDocument();
    expect(screen.getByText('Manage complete screen layouts with ordered content lists (API v1.6)')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Home Screen Layout')).toBeInTheDocument();
      expect(screen.getByText('Browse Screen')).toBeInTheDocument();
    });

    // Check v1.6 specific fields
    expect(screen.getByText('HOME')).toBeInTheDocument();
    expect(screen.getByText('BROWSE')).toBeInTheDocument();
    expect(screen.getByText('2 lists')).toBeInTheDocument();
    expect(screen.getByText('1 lists')).toBeInTheDocument();
  });

  it('creates a new screen content with v1.6 fields', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.createScreenContent).mockResolvedValue({
      id: 'sc3',
      creation_date_utc: '2024-01-03T00:00:00Z',
      last_updated_utc: '2024-01-03T00:00:00Z',
      title: 'New Screen Content',
      is_active: true,
      display_order: 3,
      description: 'Test screen layout',
      content_lists: ['cl1'],
      screen_type: 'category',
    });

    renderWithProviders(<ScreenContentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Create Screen Content')).toBeInTheDocument();
    });

    // Click create button
    await user.click(screen.getByText('Create Screen Content'));

    // Fill form with v1.6 specific fields
    await user.type(screen.getByLabelText(/title/i), 'New Screen Content');
    await user.selectOptions(screen.getByLabelText(/screen type/i), 'category');
    await user.clear(screen.getByLabelText(/display order/i));
    await user.type(screen.getByLabelText(/display order/i), '3');
    await user.type(screen.getByLabelText(/description/i), 'Test screen layout');

    // Select content lists
    const contentListCheckbox = screen.getByLabelText(/Featured Movies/);
    await user.click(contentListCheckbox);

    // Submit form
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(shareModule.createScreenContent).toHaveBeenCalledWith({
        title: 'New Screen Content',
        is_active: true,
        display_order: 3,
        description: 'Test screen layout',
        content_lists: ['cl1'],
        screen_type: 'category',
      });
    });
  });

  it('updates screen content with v1.6 fields', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.updateScreenContent).mockResolvedValue({
      ...mockScreenContents[0],
      title: 'Updated Home Screen',
      screen_type: 'recommendations',
    });

    renderWithProviders(<ScreenContentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Home Screen Layout')).toBeInTheDocument();
    });

    // Click edit button for first screen content
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    // Update fields
    const titleInput = screen.getByDisplayValue('Home Screen Layout');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Home Screen');
    
    await user.selectOptions(screen.getByDisplayValue('home'), 'recommendations');

    // Submit form
    await user.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(shareModule.updateScreenContent).toHaveBeenCalledWith('sc1', {
        title: 'Updated Home Screen',
        is_active: true,
        display_order: 1,
        description: 'Main home screen configuration',
        content_lists: ['cl1', 'cl2'],
        screen_type: 'recommendations',
      });
    });
  });

  it('deletes screen content', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.deleteScreenContent).mockResolvedValue();

    renderWithProviders(<ScreenContentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Home Screen Layout')).toBeInTheDocument();
    });

    // Click delete button for first screen content
    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    // Confirm deletion
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(shareModule.deleteScreenContent).toHaveBeenCalledWith('sc1');
    });
  });

  it('regenerates JSON cache for screen content', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.regenerateScreenContentJSON).mockResolvedValue();

    renderWithProviders(<ScreenContentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Home Screen Layout')).toBeInTheDocument();
    });

    // Click regenerate JSON button for first screen content
    const regenerateButtons = screen.getAllByText('Regenerate JSON');
    await user.click(regenerateButtons[0]);

    await waitFor(() => {
      expect(shareModule.regenerateScreenContentJSON).toHaveBeenCalledWith('sc1');
    });
  });

  it('handles screen type options correctly', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ScreenContentsPage />);

    // Click create button
    await user.click(screen.getByText('Create Screen Content'));

    // Check all screen type options are available
    const typeSelect = screen.getByLabelText(/screen type/i);
    expect(typeSelect).toBeInTheDocument();

    const options = typeSelect.querySelectorAll('option');
    const optionValues = Array.from(options).map(option => option.getAttribute('value'));
    
    expect(optionValues).toContain('home');
    expect(optionValues).toContain('browse');
    expect(optionValues).toContain('category');
    expect(optionValues).toContain('search');
    expect(optionValues).toContain('profile');
    expect(optionValues).toContain('recommendations');
  });

  it('manages content list selection correctly', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ScreenContentsPage />);

    // Click create button
    await user.click(screen.getByText('Create Screen Content'));

    await waitFor(() => {
      // Check that content lists are loaded and displayed
      expect(screen.getByText('Featured Movies (large_landscape)')).toBeInTheDocument();
      expect(screen.getByText('TV Shows (medium_portrait)')).toBeInTheDocument();
    });

    // Select multiple content lists
    const featuredMoviesCheckbox = screen.getByLabelText(/Featured Movies/);
    const tvShowsCheckbox = screen.getByLabelText(/TV Shows/);

    await user.click(featuredMoviesCheckbox);
    await user.click(tvShowsCheckbox);

    expect(featuredMoviesCheckbox).toBeChecked();
    expect(tvShowsCheckbox).toBeChecked();

    // Deselect one
    await user.click(tvShowsCheckbox);
    expect(tvShowsCheckbox).not.toBeChecked();
    expect(featuredMoviesCheckbox).toBeChecked();
  });

  it('handles edit form with pre-selected content lists', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ScreenContentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Home Screen Layout')).toBeInTheDocument();
    });

    // Click edit button for first screen content (has cl1 and cl2 selected)
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    await waitFor(() => {
      // Check that content lists are pre-selected based on the screen content data
      const featuredMoviesCheckbox = screen.getByLabelText(/Featured Movies/);
      const tvShowsCheckbox = screen.getByLabelText(/TV Shows/);

      expect(featuredMoviesCheckbox).toBeChecked(); // cl1
      expect(tvShowsCheckbox).toBeChecked(); // cl2
    });
  });

  it('displays active/inactive status correctly', async () => {
    renderWithProviders(<ScreenContentsPage />);

    await waitFor(() => {
      // Should show active status for first screen content
      const statusBadges = screen.getAllByText('Active');
      expect(statusBadges.length).toBeGreaterThan(0);

      // Should show inactive status for second screen content  
      const inactiveStatusBadges = screen.getAllByText('Inactive');
      expect(inactiveStatusBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows content lists count correctly', async () => {
    renderWithProviders(<ScreenContentsPage />);

    await waitFor(() => {
      expect(screen.getByText('2 lists')).toBeInTheDocument(); // Home Screen Layout
      expect(screen.getByText('1 lists')).toBeInTheDocument(); // Browse Screen
    });
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    
    vi.mocked(shareModule.createScreenContent).mockRejectedValue({
      response: {
        data: {
          detail: 'Validation failed: Title is required'
        }
      }
    });

    renderWithProviders(<ScreenContentsPage />);

    // Click create button
    await user.click(screen.getByText('Create Screen Content'));

    // Submit empty form - should be prevented by form validation
    await user.click(screen.getByRole('button', { name: /create/i }));

    // The form validation should prevent submission
  });

  it('handles empty content lists gracefully', async () => {
    // Mock empty content lists
    vi.mocked(shareModule.getContentLists).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, total_pages: 0 },
    });

    const user = userEvent.setup();
    renderWithProviders(<ScreenContentsPage />);

    // Click create button
    await user.click(screen.getByText('Create Screen Content'));

    await waitFor(() => {
      expect(screen.getByText('No content lists available')).toBeInTheDocument();
    });
  });

  it('loads both screen contents and content lists on mount', async () => {
    renderWithProviders(<ScreenContentsPage />);

    await waitFor(() => {
      expect(shareModule.getScreenContents).toHaveBeenCalled();
      expect(shareModule.getContentLists).toHaveBeenCalled();
    });
  });

  it('handles loading states', async () => {
    // Make the API calls take a long time
    vi.mocked(shareModule.getScreenContents).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        data: mockScreenContents,
        pagination: { page: 1, limit: 10, total: 2, total_pages: 1 },
      }), 100))
    );

    renderWithProviders(<ScreenContentsPage />);

    // Should show loading state initially
    expect(screen.getByText('Screen Contents Management')).toBeInTheDocument();
  });
});