import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SeasonList, SeasonShow, SeasonCreate, SeasonEdit } from '../../components/resources/Seasons';

// Mock react-admin
vi.mock('react-admin', () => ({
  List: ({ children, filters, actions }: any) => (
    <div data-testid="list">
      {actions}
      {Array.isArray(filters) ? filters.map((filter, index) => (
        <div key={index}>{filter}</div>
      )) : filters}
      {children}
    </div>
  ),
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  NumberField: ({ source }: any) => <div data-testid={`number-field-${source}`}>{source}</div>,
  ReferenceField: ({ source, children }: any) => (
    <div data-testid={`reference-field-${source}`}>
      {source}
      {children}
    </div>
  ),
  EditButton: () => <div data-testid="edit-button">Edit</div>,
  ShowButton: () => <div data-testid="show-button">Show</div>,
  DeleteButton: () => <div data-testid="delete-button">Delete</div>,
  Create: ({ children }: any) => <div data-testid="create">{children}</div>,
  Edit: ({ children }: any) => <div data-testid="edit">{children}</div>,
  Show: ({ children, actions }: any) => (
    <div data-testid="show">
      {actions}
      {children}
    </div>
  ),
  SimpleForm: ({ children, toolbar }: any) => (
    <div data-testid="form">
      {children}
      {toolbar}
    </div>
  ),
  SimpleShowLayout: ({ children }: any) => <div data-testid="show-layout">{children}</div>,
  TextInput: ({ source, label }: any) => <div data-testid={`input-${source}`}>{label}</div>,
  NumberInput: ({ source, label }: any) => <div data-testid={`number-input-${source}`}>{label}</div>,
  ReferenceInput: ({ source, children }: any) => (
    <div data-testid={`reference-input-${source}`}>
      {source}
      {children}
    </div>
  ),
  SelectInput: ({ optionText }: any) => (
    <div data-testid="select-input">{optionText}</div>
  ),
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  Toolbar: ({ children }: any) => <div data-testid="form-toolbar">{children}</div>,
  SaveButton: () => <div data-testid="save-button">Save</div>,
  Button: ({ label }: any) => <div data-testid={`button-${label?.toLowerCase()}`}>{label}</div>,
  ListButton: () => <div data-testid="list-button">List</div>,
  SearchInput: ({ source, placeholder }: any) => <div data-testid={`search-input-${source}`}>{placeholder}</div>,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
  CreateButton: () => <div data-testid="create-button">Create</div>,
  NumberField: ({ source }: any) => <div data-testid={`number-field-${source}`}>{source}</div>,
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

// Mock MediaDescriptionInput
vi.mock('../../components/inputs/MediaDescriptionInput', () => ({
  MediaDescriptionInput: ({ source, label }: any) => (
    <div data-testid={`media-description-input-${source}`}>{label}</div>
  ),
}));

describe('Season Components', () => {
  const mockRecord = {
    id: '123',
    title: 'Season 1',
    season_number: 1,
    program_id: 'program-456',
    creation_date_utc: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SeasonList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <SeasonList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
    });

    test('renders all required fields', () => {
      render(
        <MemoryRouter>
          <SeasonList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-season_number')).toBeInTheDocument();
      expect(screen.getByTestId('reference-field-program_id')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <SeasonList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    test('renders search input', () => {
      render(
        <MemoryRouter>
          <SeasonList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('search-input-q')).toBeInTheDocument();
    });
  });

  describe('SeasonCreate', () => {
    test('renders create form correctly', () => {
      render(
        <MemoryRouter>
          <SeasonCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('create')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required season_number field', () => {
      render(
        <MemoryRouter>
          <SeasonCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('number-input-season_number')).toBeInTheDocument();
    });

    test('includes optional season_name field', () => {
      render(
        <MemoryRouter>
          <SeasonCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-season_name')).toBeInTheDocument();
    });


    test('includes program reference field', () => {
      render(
        <MemoryRouter>
          <SeasonCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('reference-input-program_id')).toBeInTheDocument();
    });

    test('includes optional media description field', () => {
      render(
        <MemoryRouter>
          <SeasonCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('media-description-input-general_media_description_id')).toBeInTheDocument();
    });

    test('renders form toolbar', () => {
      render(
        <MemoryRouter>
          <SeasonCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('form-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
    });
  });

  describe('SeasonEdit', () => {
    test('renders edit form correctly', () => {
      render(
        <MemoryRouter>
          <SeasonEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required season_number field', () => {
      render(
        <MemoryRouter>
          <SeasonEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('number-input-season_number')).toBeInTheDocument();
    });

    test('includes optional season_name field', () => {
      render(
        <MemoryRouter>
          <SeasonEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-season_name')).toBeInTheDocument();
    });


    test('includes program reference field', () => {
      render(
        <MemoryRouter>
          <SeasonEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('reference-input-program_id')).toBeInTheDocument();
    });

    test('includes optional media description field', () => {
      render(
        <MemoryRouter>
          <SeasonEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('media-description-input-general_media_description_id')).toBeInTheDocument();
    });
  });

  describe('SeasonShow', () => {
    test('renders show layout correctly', () => {
      render(
        <MemoryRouter>
          <SeasonShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
    });

    test('displays all fields', () => {
      render(
        <MemoryRouter>
          <SeasonShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-season_number')).toBeInTheDocument();
      expect(screen.getByTestId('field-season_name')).toBeInTheDocument();
      expect(screen.getByTestId('reference-field-program_id')).toBeInTheDocument();
      expect(screen.getByTestId('reference-field-general_media_description_id')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons in toolbar', () => {
      render(
        <MemoryRouter>
          <SeasonShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });
  });
});