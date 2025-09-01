import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TerritoryList, TerritoryShow, TerritoryCreate, TerritoryEdit } from '../../components/resources/Territories';

// Mock react-admin
vi.mock('react-admin', () => ({
  List: ({ children }: any) => <div data-testid="list">{children}</div>,
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
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
  Show: ({ children }: any) => <div data-testid="show">{children}</div>,
  SimpleForm: ({ children }: any) => <div data-testid="form">{children}</div>,
  SimpleShowLayout: ({ children }: any) => <div data-testid="show-layout">{children}</div>,
  TextInput: ({ source, label }: any) => <div data-testid={`input-${source}`}>{label}</div>,
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
  SearchInput: ({ source }: any) => <div data-testid={`search-input-${source}`}>{source}</div>,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
  CreateButton: () => <div data-testid="create-button">Create</div>,
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

describe('Territory Components', () => {
  const mockRecord = {
    id: '123',
    name: 'Test Territory',
    country_id: 'country-456',
    creation_date_utc: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TerritoryList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <TerritoryList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
    });

    test('renders all required fields', () => {
      render(
        <MemoryRouter>
          <TerritoryList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('reference-field-country_id')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <TerritoryList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    test('renders search input', () => {
      render(
        <MemoryRouter>
          <TerritoryList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('search-input-q')).toBeInTheDocument();
    });
  });

  describe('TerritoryCreate', () => {
    test('renders create form correctly', () => {
      render(
        <MemoryRouter>
          <TerritoryCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('create')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required name field', () => {
      render(
        <MemoryRouter>
          <TerritoryCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });

    test('includes country reference field', () => {
      render(
        <MemoryRouter>
          <TerritoryCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('reference-input-country_id')).toBeInTheDocument();
    });

    test('renders form toolbar', () => {
      render(
        <MemoryRouter>
          <TerritoryCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('form-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
    });
  });

  describe('TerritoryEdit', () => {
    test('renders edit form correctly', () => {
      render(
        <MemoryRouter>
          <TerritoryEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required name field', () => {
      render(
        <MemoryRouter>
          <TerritoryEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });

    test('includes country reference field', () => {
      render(
        <MemoryRouter>
          <TerritoryEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('reference-input-country_id')).toBeInTheDocument();
    });
  });

  describe('TerritoryShow', () => {
    test('renders show layout correctly', () => {
      render(
        <MemoryRouter>
          <TerritoryShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
    });

    test('displays all fields', () => {
      render(
        <MemoryRouter>
          <TerritoryShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('reference-field-country_id')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons in toolbar', () => {
      render(
        <MemoryRouter>
          <TerritoryShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });
  });
});