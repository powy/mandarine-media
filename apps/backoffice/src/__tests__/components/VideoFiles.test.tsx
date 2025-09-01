import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { VideoFileList, VideoFileShow, VideoFileCreate, VideoFileEdit } from '../../components/resources/VideoFiles';

// Mock react-admin
vi.mock('react-admin', () => ({
  List: ({ children }: any) => <div data-testid="list">{children}</div>,
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  NumberField: ({ source }: any) => <div data-testid={`number-field-${source}`}>{source}</div>,
  BooleanField: ({ source }: any) => <div data-testid={`boolean-field-${source}`}>{source}</div>,
  FunctionField: ({ label, render }: any) => <div data-testid={`function-field-${label?.toLowerCase().replace(/\s+/g, '-')}`}>{label}</div>,
  EditButton: () => <div data-testid="edit-button">Edit</div>,
  ShowButton: () => <div data-testid="show-button">Show</div>,
  DeleteButton: () => <div data-testid="delete-button">Delete</div>,
  Create: ({ children }: any) => <div data-testid="create">{children}</div>,
  Edit: ({ children }: any) => <div data-testid="edit">{children}</div>,
  Show: ({ children }: any) => <div data-testid="show">{children}</div>,
  SimpleForm: ({ children }: any) => <div data-testid="form">{children}</div>,
  SimpleShowLayout: ({ children }: any) => <div data-testid="show-layout">{children}</div>,
  TextInput: ({ source, label }: any) => <div data-testid={`input-${source}`}>{label}</div>,
  NumberInput: ({ source, label }: any) => <div data-testid={`number-input-${source}`}>{label}</div>,
  SelectInput: ({ source, choices }: any) => <div data-testid={`select-input-${source}`}>{source}</div>,
  BooleanInput: ({ source, label }: any) => <div data-testid={`boolean-input-${source}`}>{label}</div>,
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  Filter: ({ children }: any) => <div data-testid="filter">{children}</div>,
  CreateButton: () => <div data-testid="create-button">Create</div>,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
  SearchInput: ({ source }: any) => <div data-testid={`search-input-${source}`}>{source}</div>,
  required: () => (value: any) => value ? undefined : 'Required',
}));

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('VideoFile Components', () => {
  const mockRecord = {
    id: '123',
    file_name: 'test-video.mp4',
    upload_status: 'upload_completed',
    encoding_status: 'completed',
    playback_policy: 'signed',
    drm_protection: true,
    duration_seconds: 3600,
    file_size_bytes: 1024000000,
    creation_date_utc: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('VideoFileList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <VideoFileList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
    });

    test('renders all required fields', () => {
      render(
        <MemoryRouter>
          <VideoFileList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-upload_status')).toBeInTheDocument();
      expect(screen.getByTestId('field-playback_policy')).toBeInTheDocument();
      expect(screen.getByTestId('number-field-duration_seconds')).toBeInTheDocument();
      expect(screen.getByTestId('number-field-file_size_bytes')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-drm_protection')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <VideoFileList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    test('renders toolbar actions', () => {
      render(
        <MemoryRouter>
          <VideoFileList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });
  });

  describe('VideoFileCreate', () => {
    test('renders create form correctly', () => {
      render(
        <MemoryRouter>
          <VideoFileCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('create')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required file_name field', () => {
      render(
        <MemoryRouter>
          <VideoFileCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-file_name')).toBeInTheDocument();
    });

    test('includes external_url field', () => {
      render(
        <MemoryRouter>
          <VideoFileCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-external_url')).toBeInTheDocument();
    });

    test('includes status select fields', () => {
      render(
        <MemoryRouter>
          <VideoFileCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('select-input-upload_status')).toBeInTheDocument();
      expect(screen.getByTestId('select-input-encoding_status')).toBeInTheDocument();
      expect(screen.getByTestId('select-input-playback_policy')).toBeInTheDocument();
    });

    test('includes technical specification fields', () => {
      render(
        <MemoryRouter>
          <VideoFileCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('number-input-duration_seconds')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-file_size_bytes')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-max_resolution_width')).toBeInTheDocument();
      expect(screen.getByTestId('number-input-max_resolution_height')).toBeInTheDocument();
    });

    test('includes DRM protection field', () => {
      render(
        <MemoryRouter>
          <VideoFileCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('boolean-input-drm_protection')).toBeInTheDocument();
    });
  });

  describe('VideoFileEdit', () => {
    test('renders edit form correctly', () => {
      render(
        <MemoryRouter>
          <VideoFileEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required file_name field', () => {
      render(
        <MemoryRouter>
          <VideoFileEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-file_name')).toBeInTheDocument();
    });

    test('includes status select fields', () => {
      render(
        <MemoryRouter>
          <VideoFileEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('select-input-upload_status')).toBeInTheDocument();
      expect(screen.getByTestId('select-input-encoding_status')).toBeInTheDocument();
      expect(screen.getByTestId('select-input-playback_policy')).toBeInTheDocument();
    });

    test('includes mux fields (disabled)', () => {
      render(
        <MemoryRouter>
          <VideoFileEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-mux_asset_id')).toBeInTheDocument();
      expect(screen.getByTestId('input-mux_playback_id')).toBeInTheDocument();
      expect(screen.getByTestId('input-encoding_logs')).toBeInTheDocument();
    });
  });

  describe('VideoFileShow', () => {
    test('renders show layout correctly', () => {
      render(
        <MemoryRouter>
          <VideoFileShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
    });

    test('displays all fields', () => {
      render(
        <MemoryRouter>
          <VideoFileShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-file_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-upload_status')).toBeInTheDocument();
      expect(screen.getByTestId('field-encoding_status')).toBeInTheDocument();
      expect(screen.getByTestId('field-playback_policy')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-drm_protection')).toBeInTheDocument();
      expect(screen.getByTestId('number-field-duration_seconds')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('displays function fields for complex data', () => {
      render(
        <MemoryRouter>
          <VideoFileShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('function-field-subtitle-tracks')).toBeInTheDocument();
      expect(screen.getByTestId('function-field-supported-resolutions')).toBeInTheDocument();
      expect(screen.getByTestId('function-field-accessibilities')).toBeInTheDocument();
      expect(screen.getByTestId('function-field-audio-languages')).toBeInTheDocument();
    });
  });
});