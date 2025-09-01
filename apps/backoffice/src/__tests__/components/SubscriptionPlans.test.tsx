import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SubscriptionPlanList, SubscriptionPlanShow, SubscriptionPlanCreate, SubscriptionPlanEdit } from '../../components/resources/SubscriptionPlans';

// Mock react-admin
vi.mock('react-admin', () => ({
  List: ({ children }: any) => <div data-testid="list">{children}</div>,
  Datagrid: ({ children }: any) => <div data-testid="datagrid">{children}</div>,
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  EditButton: () => <div data-testid="edit-button">Edit</div>,
  ShowButton: () => <div data-testid="show-button">Show</div>,
  DeleteButton: () => <div data-testid="delete-button">Delete</div>,
  Create: ({ children }: any) => <div data-testid="create">{children}</div>,
  Edit: ({ children }: any) => <div data-testid="edit">{children}</div>,
  Show: ({ children }: any) => <div data-testid="show">{children}</div>,
  SimpleForm: ({ children }: any) => <div data-testid="form">{children}</div>,
  SimpleShowLayout: ({ children }: any) => <div data-testid="show-layout">{children}</div>,
  TextInput: ({ source, label }: any) => <div data-testid={`input-${source}`}>{label}</div>,
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

describe('SubscriptionPlan Components', () => {
  const mockRecord = {
    id: '123',
    name: 'Premium Plan',
    creation_date_utc: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SubscriptionPlanList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
    });

    test('renders all required fields', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    test('renders search input', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('search-input-q')).toBeInTheDocument();
    });
  });

  describe('SubscriptionPlanCreate', () => {
    test('renders create form correctly', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('create')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required name field', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });

    test('renders form toolbar', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('form-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
    });
  });

  describe('SubscriptionPlanEdit', () => {
    test('renders edit form correctly', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required name field', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-name')).toBeInTheDocument();
    });
  });

  describe('SubscriptionPlanShow', () => {
    test('renders show layout correctly', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
    });

    test('displays all fields', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons in toolbar', () => {
      render(
        <MemoryRouter>
          <SubscriptionPlanShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });
  });
});