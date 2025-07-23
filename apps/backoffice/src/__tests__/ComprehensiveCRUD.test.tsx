import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the shared API
vi.mock('share', () => ({
  initApiClient: vi.fn(),
  authApi: {
    login: vi.fn().mockResolvedValue({ access_token: 'test-token' }),
  },
  mediaApi: {
    getMediaDescriptions: vi.fn().mockResolvedValue({ data: [] }),
    createMediaDescription: vi.fn().mockResolvedValue({ id: '1', episode_title: 'Test Media' }),
    updateMediaDescription: vi.fn().mockResolvedValue({ id: '1', episode_title: 'Updated Media' }),
    deleteMediaDescription: vi.fn().mockResolvedValue({}),
  },
  videoFilesApi: {
    getVideoFiles: vi.fn().mockResolvedValue({ data: [] }),
    createVideoFile: vi.fn().mockResolvedValue({ id: '1', filename: 'test.mp4' }),
    updateVideoFile: vi.fn().mockResolvedValue({ id: '1', filename: 'updated.mp4' }),
    deleteVideoFile: vi.fn().mockResolvedValue({}),
  },
  usersApi: {
    getUsers: vi.fn().mockResolvedValue({ data: [] }),
    createUser: vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
    updateUser: vi.fn().mockResolvedValue({ id: '1', email: 'updated@example.com' }),
    deleteUser: vi.fn().mockResolvedValue({}),
  },
  personsApi: {
    getPublicPersons: vi.fn().mockResolvedValue({ data: [] }),
    createPublicPerson: vi.fn().mockResolvedValue({ id: '1', name: 'Test Person' }),
    updatePublicPerson: vi.fn().mockResolvedValue({ id: '1', name: 'Updated Person' }),
    deletePublicPerson: vi.fn().mockResolvedValue({}),
  }
}));

// Import App after mocking
import App from '../App';

describe('Comprehensive CRUD Operations Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'test-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
    
    // Mock fetch for auth check
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 1, email: 'test@test.com' })
    });
  });

  describe('Bug 1: Media Description Creation with episode_title', () => {
    it('should create media description with episode_title field', async () => {
      const { mediaApi } = await import('shared');
      
      render(<App />);
      
      // Navigate to Media Descriptions
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /media descriptions/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /media descriptions/i }));
      
      // Click Add New Media
      await waitFor(() => {
        expect(screen.getByText('Add New Media')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Add New Media'));
      
      // Wait for form
      await waitFor(() => {
        expect(screen.getByText('Create Media Description')).toBeInTheDocument();
      });
      
      // Fill required fields including episode_title
      const titleInput = screen.getByPlaceholderText('Enter media title');
      fireEvent.change(titleInput, { target: { value: 'Test Episode Title' } });
      
      const descriptionInput = screen.getByPlaceholderText('Enter description');
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
      
      const fileNumberInput = screen.getByPlaceholderText('123456');
      fireEvent.change(fileNumberInput, { target: { value: '12345' } });
      
      // Save
      fireEvent.click(screen.getByText('Save'));
      
      // Should call API with episode_title and correct backend fields
      await waitFor(() => {
        expect(mediaApi.createMediaDescription).toHaveBeenCalledWith(
          expect.objectContaining({
            episode_title: 'Test Episode Title',
            descriptive_summary_text: 'Test description',
            file_number: expect.any(Number),
            content_status: 'draft',
            media_type: 'video'
          })
        );
      });
    });
  });

  describe('Bug 2: Media Description file_number should be integer', () => {
    it('should create media description with integer file_number', async () => {
      const { mediaApi } = await import('shared');
      
      render(<App />);
      
      // Navigate and create
      fireEvent.click(screen.getByRole('button', { name: /media descriptions/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Add New Media')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Add New Media'));
      
      await waitFor(() => {
        expect(screen.getByText('Create Media Description')).toBeInTheDocument();
      });
      
      // Fill form
      fireEvent.change(screen.getByPlaceholderText('Enter media title'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('Enter description'), { target: { value: 'Test' } });
      
      // Save with default file number
      fireEvent.click(screen.getByText('Save'));
      
      // Should call API with integer file_number
      await waitFor(() => {
        expect(mediaApi.createMediaDescription).toHaveBeenCalledWith(
          expect.objectContaining({
            file_number: expect.any(Number)
          })
        );
      });
    });
  });

  describe('Bug 3: User Creation', () => {
    it('should create new user successfully', async () => {
      const { usersApi } = await import('shared');
      
      render(<App />);
      
      // Navigate to Users
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /users/i })).toHaveLength(2);
      });
      
      const userButtons = screen.getAllByRole('button', { name: /users/i });
      fireEvent.click(userButtons[0]); // Click the navigation button
      
      // Click Add New User
      await waitFor(() => {
        expect(screen.getByText('Add New User')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Add New User'));
      
      // Wait for form
      await waitFor(() => {
        expect(screen.getByText('Create User')).toBeInTheDocument();
      });
      
      // Fill required fields
      const emailInput = screen.getByPlaceholderText('user@example.com');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      const passwordInput = screen.getByPlaceholderText('Enter password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      // Save
      fireEvent.click(screen.getByText('Save'));
      
      // Should call API
      await waitFor(() => {
        expect(usersApi.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            password: 'password123'
          })
        );
      });
    });
  });

  describe('Bug 4: Video File Creation', () => {
    it('should create new video file successfully', async () => {
      const { videoFilesApi } = await import('shared');
      
      render(<App />);
      
      // Navigate to Video Files
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /video files/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /video files/i }));
      
      // Click Add New Video File
      await waitFor(() => {
        expect(screen.getByText('Add New Video File')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Add New Video File'));
      
      // Wait for form
      await waitFor(() => {
        expect(screen.getByText('Create Video File')).toBeInTheDocument();
      });
      
      // Fill required fields
      const filenameInput = screen.getByPlaceholderText('Enter filename');
      fireEvent.change(filenameInput, { target: { value: 'test-video.mp4' } });
      
      const pathInput = screen.getByPlaceholderText('Enter file path');
      fireEvent.change(pathInput, { target: { value: '/videos/test-video.mp4' } });
      
      // Save
      fireEvent.click(screen.getByText('Save'));
      
      // Should call API
      await waitFor(() => {
        expect(videoFilesApi.createVideoFile).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: 'test-video.mp4',
            path: '/videos/test-video.mp4'
          })
        );
      });
    });
  });

  describe('Bug 5: User Edit', () => {
    it('should edit user successfully', async () => {
      const { usersApi } = await import('shared');
      
      // Mock user data
      usersApi.getUsers.mockResolvedValue({
        data: [{ id: '1', email: 'existing@example.com', name: 'Existing User' }]
      });
      
      render(<App />);
      
      // Navigate to Users
      fireEvent.click(screen.getByRole('button', { name: /users/i }));
      
      // Wait for user list and click edit
      await waitFor(() => {
        expect(screen.getByText('existing@example.com')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Edit'));
      
      // Wait for edit form
      await waitFor(() => {
        expect(screen.getByText('Edit User')).toBeInTheDocument();
      });
      
      // Modify email
      const emailInput = screen.getByDisplayValue('existing@example.com');
      fireEvent.change(emailInput, { target: { value: 'updated@example.com' } });
      
      // Save
      fireEvent.click(screen.getByText('Save'));
      
      // Should call API
      await waitFor(() => {
        expect(usersApi.updateUser).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            email: 'updated@example.com'
          })
        );
      });
    });
  });

  describe('Bug 6: Public Person Creation', () => {
    it('should create new public person successfully', async () => {
      const { personsApi } = await import('shared');
      
      render(<App />);
      
      // Navigate to Public Persons
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /public persons/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /public persons/i }));
      
      // Click Add New Person
      await waitFor(() => {
        expect(screen.getByText('Add New Person')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Add New Person'));
      
      // Wait for form
      await waitFor(() => {
        expect(screen.getByText('Create Public Person')).toBeInTheDocument();
      });
      
      // Fill required fields
      const nameInput = screen.getByPlaceholderText('Enter name');
      fireEvent.change(nameInput, { target: { value: 'Test Person' } });
      
      const bioInput = screen.getByPlaceholderText('Enter biography');
      fireEvent.change(bioInput, { target: { value: 'Test biography' } });
      
      // Save
      fireEvent.click(screen.getByText('Save'));
      
      // Should call API
      await waitFor(() => {
        expect(personsApi.createPublicPerson).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Person',
            biography: 'Test biography'
          })
        );
      });
    });
  });

  describe('Additional CRUD Operations', () => {
    describe('Video File Edit/Delete', () => {
      it('should edit video file successfully', async () => {
        const { videoFilesApi } = await import('shared');
        
        // Mock video file data
        videoFilesApi.getVideoFiles.mockResolvedValue({
          data: [{ id: '1', filename: 'existing.mp4', path: '/videos/existing.mp4' }]
        });
        
        render(<App />);
        
        // Navigate and edit
        fireEvent.click(screen.getByRole('button', { name: /video files/i }));
        
        await waitFor(() => {
          expect(screen.getByText('existing.mp4')).toBeInTheDocument();
        });
        
        fireEvent.click(screen.getByText('Edit'));
        
        await waitFor(() => {
          expect(screen.getByText('Edit Video File')).toBeInTheDocument();
        });
        
        // Update filename
        const filenameInput = screen.getByDisplayValue('existing.mp4');
        fireEvent.change(filenameInput, { target: { value: 'updated.mp4' } });
        
        fireEvent.click(screen.getByText('Save'));
        
        await waitFor(() => {
          expect(videoFilesApi.updateVideoFile).toHaveBeenCalledWith(
            '1',
            expect.objectContaining({
              filename: 'updated.mp4'
            })
          );
        });
      });

      it('should delete video file successfully', async () => {
        const { videoFilesApi } = await import('shared');
        
        videoFilesApi.getVideoFiles.mockResolvedValue({
          data: [{ id: '1', filename: 'test.mp4', path: '/videos/test.mp4' }]
        });
        
        render(<App />);
        
        fireEvent.click(screen.getByRole('button', { name: /video files/i }));
        
        await waitFor(() => {
          expect(screen.getByText('test.mp4')).toBeInTheDocument();
        });
        
        fireEvent.click(screen.getByText('Delete'));
        
        // Confirm deletion
        fireEvent.click(screen.getByText('Confirm'));
        
        await waitFor(() => {
          expect(videoFilesApi.deleteVideoFile).toHaveBeenCalledWith('1');
        });
      });
    });

    describe('Public Person Edit/Delete', () => {
      it('should edit public person successfully', async () => {
        const { personsApi } = await import('shared');
        
        personsApi.getPublicPersons.mockResolvedValue({
          data: [{ id: '1', name: 'Existing Person', biography: 'Existing bio' }]
        });
        
        render(<App />);
        
        fireEvent.click(screen.getByRole('button', { name: /public persons/i }));
        
        await waitFor(() => {
          expect(screen.getByText('Existing Person')).toBeInTheDocument();
        });
        
        fireEvent.click(screen.getByText('Edit'));
        
        await waitFor(() => {
          expect(screen.getByText('Edit Public Person')).toBeInTheDocument();
        });
        
        const nameInput = screen.getByDisplayValue('Existing Person');
        fireEvent.change(nameInput, { target: { value: 'Updated Person' } });
        
        fireEvent.click(screen.getByText('Save'));
        
        await waitFor(() => {
          expect(personsApi.updatePublicPerson).toHaveBeenCalledWith(
            '1',
            expect.objectContaining({
              name: 'Updated Person'
            })
          );
        });
      });

      it('should delete public person successfully', async () => {
        const { personsApi } = await import('shared');
        
        personsApi.getPublicPersons.mockResolvedValue({
          data: [{ id: '1', name: 'Test Person', biography: 'Test bio' }]
        });
        
        render(<App />);
        
        fireEvent.click(screen.getByRole('button', { name: /public persons/i }));
        
        await waitFor(() => {
          expect(screen.getByText('Test Person')).toBeInTheDocument();
        });
        
        fireEvent.click(screen.getByText('Delete'));
        
        fireEvent.click(screen.getByText('Confirm'));
        
        await waitFor(() => {
          expect(personsApi.deletePublicPerson).toHaveBeenCalledWith('1');
        });
      });
    });

    describe('User Delete', () => {
      it('should delete user successfully', async () => {
        const { usersApi } = await import('shared');
        
        usersApi.getUsers.mockResolvedValue({
          data: [{ id: '1', email: 'test@example.com', name: 'Test User' }]
        });
        
        render(<App />);
        
        fireEvent.click(screen.getByRole('button', { name: /users/i }));
        
        await waitFor(() => {
          expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });
        
        fireEvent.click(screen.getByText('Delete'));
        
        fireEvent.click(screen.getByText('Confirm'));
        
        await waitFor(() => {
          expect(usersApi.deleteUser).toHaveBeenCalledWith('1');
        });
      });
    });
  });
});