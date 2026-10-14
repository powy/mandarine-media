import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { VideoFileReportList, VideoFileReportShow } from '../../components/resources/VideoFileReports';

// Mock react-admin
vi.mock('react-admin', async () => ({
  ...(await import('../mocks/react-admin.mock')).reactAdminMock,
  List: ({ children, filters, actions }: any) => (
    <div data-testid="list">
      {actions}
      {filters}
      {children}
    </div>
  ),
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  FunctionField: ({ label, render }: any) => <div data-testid={`function-field-${label?.toLowerCase().replace(/\s+/g, '-')}`}>{label}</div>,
  ShowButton: () => <div data-testid="show-button">Show</div>,
  Show: ({ children, actions }: any) => (
    <div data-testid="show">
      {actions}
      {children}
    </div>
  ),
  SimpleShowLayout: ({ children }: any) => <div data-testid="show-layout">{children}</div>,
  TextInput: ({ source, label }: any) => <div data-testid={`input-${source}`}>{label}</div>,
  SelectInput: ({ source, choices }: any) => <div data-testid={`select-input-${source}`}>{source}</div>,
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  Filter: ({ children }: any) => <div data-testid="filter">{children}</div>,
  ListButton: () => <div data-testid="list-button">List</div>,
  SearchInput: ({ source }: any) => <div data-testid={`search-input-${source}`}>{source}</div>,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
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

describe('VideoFileReport Components', () => {
  const mockRecord = {
    id: '123',
    video_file_id: 'video-456',
    video_file_name: 'test-video.mp4',
    video_file_url: 'https://example.com/video.mp4',
    file_size: '1024MB',
    duration: '01:30:00',
    media_description_id: 'media-789',
    media_description_title: 'Test Movie',
    event: 'possible_orphan',
    timestamp: '2025-01-01T00:00:00Z',
    additional_info: 'Video file may be orphaned'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('VideoFileReportList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <VideoFileReportList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
    });

    test('renders all required fields', () => {
      render(
        <MemoryRouter>
          <VideoFileReportList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-video_file_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-media_description_title')).toBeInTheDocument();
      expect(screen.getByTestId('function-field-event')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-timestamp')).toBeInTheDocument();
      expect(screen.getByTestId('field-file_size')).toBeInTheDocument();
      expect(screen.getByTestId('field-duration')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <VideoFileReportList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show-button')).toBeInTheDocument();
    });

    test('renders filters', () => {
      render(
        <MemoryRouter>
          <VideoFileReportList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('search-input-q')).toBeInTheDocument();
      expect(screen.getByTestId('select-input-event')).toBeInTheDocument();
    });
  });

  describe('VideoFileReportShow', () => {
    test('renders show layout correctly', () => {
      render(
        <MemoryRouter>
          <VideoFileReportShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
    });

    test('displays all fields', () => {
      render(
        <MemoryRouter>
          <VideoFileReportShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-video_file_id')).toBeInTheDocument();
      expect(screen.getByTestId('field-video_file_name')).toBeInTheDocument();
      expect(screen.getByTestId('field-video_file_url')).toBeInTheDocument();
      expect(screen.getByTestId('field-file_size')).toBeInTheDocument();
      expect(screen.getByTestId('field-duration')).toBeInTheDocument();
      expect(screen.getByTestId('field-media_description_id')).toBeInTheDocument();
      expect(screen.getByTestId('field-media_description_title')).toBeInTheDocument();
      expect(screen.getByTestId('function-field-event-type')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-timestamp')).toBeInTheDocument();
      expect(screen.getByTestId('field-additional_info')).toBeInTheDocument();
    });

    test('renders action buttons in toolbar', () => {
      render(
        <MemoryRouter>
          <VideoFileReportShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });
  });
});