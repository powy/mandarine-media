import { vi } from 'vitest';

// Comprehensive React Admin mock for all components
export const reactAdminMock = {
  // Layout Components
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
  
  // Field Components
  TextField: ({ source }: any) => <div data-testid={`field-${source}`}>{source}</div>,
  DateField: ({ source }: any) => <div data-testid={`date-field-${source}`}>{source}</div>,
  NumberField: ({ source }: any) => <div data-testid={`number-field-${source}`}>{source}</div>,
  BooleanField: ({ source }: any) => <div data-testid={`boolean-field-${source}`}>{source}</div>,
  ImageField: ({ source }: any) => <div data-testid={`image-field-${source}`}>{source}</div>,
  UrlField: ({ source }: any) => <div data-testid={`url-field-${source}`}>{source}</div>,
  FunctionField: ({ label }: any) => <div data-testid="function-field">{label}</div>,
  ReferenceField: ({ source, children }: any) => (
    <div data-testid={`reference-field-${source}`}>
      {source}
      {children}
    </div>
  ),
  ArrayField: ({ children }: any) => <div data-testid="array-field">{children}</div>,
  SingleFieldList: ({ children }: any) => <div data-testid="single-field-list">{children}</div>,
  ChipField: ({ source }: any) => <div data-testid={`chip-field-${source}`}>{source}</div>,
  
  // Input Components
  TextInput: ({ source, label }: any) => <div data-testid={`input-${source}`}>{label}</div>,
  NumberInput: ({ source, label }: any) => <div data-testid={`number-input-${source}`}>{label}</div>,
  BooleanInput: ({ source, label }: any) => <div data-testid={`boolean-input-${source}`}>{label}</div>,
  SelectInput: ({ source, label, optionText }: any) => <div data-testid={`select-input${source ? `-${source}` : ''}`}>{label || optionText}</div>,
  ReferenceInput: ({ source, children }: any) => (
    <div data-testid={`reference-input-${source}`}>
      {source}
      {children}
    </div>
  ),
  AutocompleteInput: ({ source, label }: any) => <div data-testid={`autocomplete-input-${source}`}>{label}</div>,
  ArrayInput: ({ children }: any) => <div data-testid="array-input">{children}</div>,
  ReferenceArrayInput: ({ source, children }: any) => (
    <div data-testid={`reference-array-input-${source}`}>{children}</div>
  ),
  AutocompleteArrayInput: ({ source }: any) => <div data-testid={`autocomplete-array-input-${source}`} />,
  SelectArrayInput: ({ source }: any) => <div data-testid={`select-array-input-${source}`} />,
  SimpleFormIterator: ({ children }: any) => <div data-testid="form-iterator">{children}</div>,
  
  // Button Components
  EditButton: () => <div data-testid="edit-button">Edit</div>,
  ShowButton: () => <div data-testid="show-button">Show</div>,
  DeleteButton: () => <div data-testid="delete-button">Delete</div>,
  CreateButton: () => <div data-testid="create-button">Create</div>,
  SaveButton: () => <div data-testid="save-button">Save</div>,
  Button: ({ label, onClick }: any) => <div data-testid={`button-${label?.toLowerCase()}`} onClick={onClick}>{label}</div>,
  ListButton: ({ label }: any) => <div data-testid="list-button">{label || 'List'}</div>,
  FilterButton: () => <div data-testid="filter-button">Filter</div>,
  ExportButton: () => <div data-testid="export-button">Export</div>,
  
  // Toolbar Components
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  Toolbar: ({ children }: any) => <div data-testid="form-toolbar">{children}</div>,
  
  // Filter Components
  Filter: ({ children }: any) => <div data-testid="filter">{children}</div>,
  SearchInput: ({ source, placeholder }: any) => <div data-testid={`search-input-${source}`}>{placeholder}</div>,
  
  // Validation Functions
  required: vi.fn(() => (value: any) => value ? undefined : 'Required'),
  email: vi.fn(() => (value: any) => value && !/\S+@\S+\.\S+/.test(value) ? 'Invalid email' : undefined),
  
  // Hooks
  useRecordContext: vi.fn(() => ({})),
  useNotify: vi.fn(() => vi.fn()),
  useRefresh: vi.fn(() => vi.fn()),
  useRedirect: vi.fn(() => vi.fn()),
  useGetList: vi.fn(() => ({ data: [], total: 0, isLoading: false })),
};