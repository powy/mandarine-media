import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { MediaDescriptionList, MediaDescriptionShow, MediaDescriptionCreate, MediaDescriptionEdit } from '../../components/resources/MediaDescriptions';

// Mock custom input components
vi.mock('../../components/inputs/ProgramInput', () => ({
  ProgramInput: ({ source, label }: any) => <div data-testid={`program-input-${source}`}>{label}</div>,
}));

vi.mock('../../components/inputs/SeasonInput', () => ({
  SeasonInput: ({ source, label }: any) => <div data-testid={`season-input-${source}`}>{label}</div>,
}));

vi.mock('../../components/inputs/PictureInput', () => ({
  PictureInput: ({ source, label }: any) => <div data-testid={`picture-input-${source}`}>{label}</div>,
}));

vi.mock('../../components/inputs/RelationshipInputs', () => ({
  ThemeInput: () => <div data-testid="theme-input">Themes</div>,
  ActorInput: () => <div data-testid="actor-input">Actors</div>,
  DirectorInput: () => <div data-testid="director-input">Directors</div>,
  ProducerInput: () => <div data-testid="producer-input">Producers</div>,
  AuthorInput: () => <div data-testid="author-input">Authors</div>,
  OriginCountryInput: () => <div data-testid="origin-country-input">Origin Countries</div>,
  AvailableCountryInput: () => <div data-testid="available-country-input">Available Countries</div>,
  OriginalLanguageInput: () => <div data-testid="original-language-input">Original Languages</div>,
  AvailableSubtitleLanguageInput: () => <div data-testid="available-subtitle-language-input">Subtitle Languages</div>,
  AvailableAudioLanguageInput: () => <div data-testid="available-audio-language-input">Audio Languages</div>,
  AudienceCategoryInput: () => <div data-testid="audience-category-input">Audience Categories</div>,
  EligiblePlanInput: () => <div data-testid="eligible-plan-input">Eligible Plans</div>,
  TrailerInput: () => <div data-testid="trailer-input">Trailers</div>,
  ExcerptInput: () => <div data-testid="excerpt-input">Excerpts</div>,
  MediaCategoriesInput: () => <div data-testid="media-categories-input">Media Categories</div>,
  MediaThemeInput: () => <div data-testid="media-theme-input">Media Themes</div>,
  AdditionalImageInput: () => <div data-testid="additional-image-input">Additional Images</div>,
}));

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
  NumberField: ({ source }: any) => <div data-testid={`number-field-${source}`}>{source}</div>,
  BooleanField: ({ source }: any) => <div data-testid={`boolean-field-${source}`}>{source}</div>,
  ArrayField: ({ source }: any) => <div data-testid={`array-field-${source}`}>{source}</div>,
  SingleFieldList: ({ children }: any) => <div data-testid="single-field-list">{children}</div>,
  ChipField: ({ source }: any) => <div data-testid={`chip-field-${source}`}>{source}</div>,
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
  SelectInput: ({ source, choices }: any) => <div data-testid={`select-input-${source}`}>{source}</div>,
  BooleanInput: ({ source, label }: any) => <div data-testid={`boolean-input-${source}`}>{label}</div>,
  DateInput: ({ source, label }: any) => <div data-testid={`date-input-${source}`}>{label}</div>,
  TopToolbar: ({ children }: any) => <div data-testid="toolbar">{children}</div>,
  Filter: ({ children }: any) => <div data-testid="filter">{children}</div>,
  CreateButton: () => <div data-testid="create-button">Create</div>,
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

describe('MediaDescription Components', () => {
  const mockRecord = {
    id: '123',
    episode_title: 'Test Episode',
    media_type: 'video',
    file_number: 1,
    episode_number: 5,
    main_video_file_id: 'video-file-123',
    content_status: 'published',
    is_featured: true,
    production_year: 2023,
    creation_date_utc: '2025-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MediaDescriptionList', () => {
    test('renders list structure correctly', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('datagrid')).toBeInTheDocument();
    });

    test('renders all required fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-episode_title')).toBeInTheDocument();
      expect(screen.getByTestId('field-media_type')).toBeInTheDocument();
      expect(screen.getByTestId('number-field-file_number')).toBeInTheDocument();
      expect(screen.getByTestId('field-content_status')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-is_featured')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    test('renders filters', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionList />
        </MemoryRouter>
      );

      expect(screen.getByTestId('filter')).toBeInTheDocument();
      expect(screen.getByTestId('input-q')).toBeInTheDocument();
      expect(screen.getByTestId('select-input-media_type')).toBeInTheDocument();
      expect(screen.getByTestId('select-input-content_status')).toBeInTheDocument();
    });
  });

  describe('MediaDescriptionCreate', () => {
    test('renders create form correctly', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('create')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      // file_number is auto-generated, so the create form has no input for it
      expect(screen.queryByTestId('number-input-file_number')).not.toBeInTheDocument();
      expect(screen.getByTestId('input-episode_title')).toBeInTheDocument();
      expect(screen.getByTestId('select-input-media_type')).toBeInTheDocument();
    });

    test('includes program and season inputs', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('program-input-program_id')).toBeInTheDocument();
      expect(screen.getByTestId('season-input-season_id')).toBeInTheDocument();
    });

    test('includes main video file field', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-main_video_file_id')).toBeInTheDocument();
    });

    test('includes relationship inputs', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('actor-input')).toBeInTheDocument();
      expect(screen.getByTestId('director-input')).toBeInTheDocument();
      expect(screen.getByTestId('producer-input')).toBeInTheDocument();
      expect(screen.getByTestId('author-input')).toBeInTheDocument();
      expect(screen.getByTestId('media-categories-input')).toBeInTheDocument();
      expect(screen.getByTestId('media-theme-input')).toBeInTheDocument();
    });

    test('includes contract date fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('date-input-contract_start_date_utc')).toBeInTheDocument();
      expect(screen.getByTestId('date-input-contract_end_date_utc')).toBeInTheDocument();
      expect(screen.getByTestId('date-input-original_broadcast_date_utc')).toBeInTheDocument();
    });

    test('includes SEO fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-seo_title')).toBeInTheDocument();
      expect(screen.getByTestId('input-seo_description')).toBeInTheDocument();
      expect(screen.getByTestId('input-seo_keywords_text_list')).toBeInTheDocument();
      expect(screen.getByTestId('input-hashtags_text_list')).toBeInTheDocument();
      expect(screen.getByTestId('input-human_keywords_text_list')).toBeInTheDocument();
    });

    test('includes v1.9 fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('input-slug')).toBeInTheDocument();
    });

    test('includes picture inputs', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('picture-input-image_1920_1080_id')).toBeInTheDocument();
      expect(screen.getByTestId('picture-input-image_1920_720_id')).toBeInTheDocument();
      expect(screen.getByTestId('picture-input-image_1080_1080_id')).toBeInTheDocument();
      expect(screen.getByTestId('picture-input-image_810_1080_id')).toBeInTheDocument();
      expect(screen.getByTestId('picture-input-image_1080_1920_id')).toBeInTheDocument();
    });

    test('includes new image fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('picture-input-image_mobile_home')).toBeInTheDocument();
      expect(screen.getByTestId('picture-input-image_desktop_home')).toBeInTheDocument();
    });

    test('includes additional image input', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionCreate />
        </MemoryRouter>
      );

      expect(screen.getByTestId('additional-image-input')).toBeInTheDocument();
    });
  });

  describe('MediaDescriptionEdit', () => {
    test('renders edit form correctly', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('edit')).toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });

    test('includes required fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('number-input-file_number')).toBeInTheDocument();
      expect(screen.getByTestId('input-episode_title')).toBeInTheDocument();
      expect(screen.getByTestId('select-input-media_type')).toBeInTheDocument();
    });

    test('includes all relationship inputs', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionEdit />
        </MemoryRouter>
      );

      expect(screen.getByTestId('actor-input')).toBeInTheDocument();
      expect(screen.getByTestId('director-input')).toBeInTheDocument();
      expect(screen.getByTestId('producer-input')).toBeInTheDocument();
      expect(screen.getByTestId('author-input')).toBeInTheDocument();
      expect(screen.getByTestId('origin-country-input')).toBeInTheDocument();
      expect(screen.getByTestId('available-country-input')).toBeInTheDocument();
      expect(screen.getByTestId('original-language-input')).toBeInTheDocument();
      expect(screen.getByTestId('audience-category-input')).toBeInTheDocument();
      expect(screen.getByTestId('eligible-plan-input')).toBeInTheDocument();
      expect(screen.getByTestId('trailer-input')).toBeInTheDocument();
      expect(screen.getByTestId('excerpt-input')).toBeInTheDocument();
    });
  });

  describe('MediaDescriptionShow', () => {
    test('renders show layout correctly', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('show')).toBeInTheDocument();
      expect(screen.getByTestId('show-layout')).toBeInTheDocument();
    });

    test('displays all basic fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('field-id')).toBeInTheDocument();
      expect(screen.getByTestId('field-episode_title')).toBeInTheDocument();
      expect(screen.getByTestId('field-media_type')).toBeInTheDocument();
      expect(screen.getByTestId('number-field-file_number')).toBeInTheDocument();
      expect(screen.getByTestId('number-field-episode_number')).toBeInTheDocument();
      expect(screen.getByTestId('field-main_video_file_id')).toBeInTheDocument();
      expect(screen.getByTestId('field-content_status')).toBeInTheDocument();
      expect(screen.getByTestId('boolean-field-is_featured')).toBeInTheDocument();
    });

    test('displays relationship array fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('array-field-actors')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-directors')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-producers')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-authors')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-media_themes')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-origin_countries')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-available_countries')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-original_languages')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-audience_categories')).toBeInTheDocument();
      expect(screen.getByTestId('array-field-eligible_plans')).toBeInTheDocument();
    });

    test('displays timestamp fields', () => {
      render(
        <MemoryRouter>
          <MediaDescriptionShow />
        </MemoryRouter>
      );

      expect(screen.getByTestId('date-field-creation_date_utc')).toBeInTheDocument();
      expect(screen.getByTestId('date-field-last_updated_utc')).toBeInTheDocument();
    });
  });
});