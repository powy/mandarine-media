import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CopyMediaDescriptionButton } from '../../components/resources/CopyMediaDescriptionButton';

// Mock react-admin hooks
const mockNotify = vi.fn();
const mockRedirect = vi.fn();
const mockUseRecordContext = vi.fn();

vi.mock('react-admin', () => ({
  Button: ({ onClick, label }: any) => (
    <button data-testid="copy-button" onClick={onClick}>
      {label}
    </button>
  ),
  useRecordContext: () => mockUseRecordContext(),
  useNotify: () => mockNotify,
  useRedirect: () => mockRedirect,
}));

// Mock Material-UI icon
vi.mock('@mui/icons-material/ContentCopy', () => ({
  default: () => <span data-testid="copy-icon">Copy Icon</span>,
}));

describe('CopyMediaDescriptionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the button with correct label', () => {
    mockUseRecordContext.mockReturnValue({
      id: '123',
      episode_title: 'Test Episode',
    });

    render(<CopyMediaDescriptionButton />);

    expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    expect(screen.getByText('Copy into New')).toBeInTheDocument();
  });

  test('renders with custom label', () => {
    mockUseRecordContext.mockReturnValue({
      id: '123',
      episode_title: 'Test Episode',
    });

    render(<CopyMediaDescriptionButton label="Duplicate" />);

    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });

  test('excludes system-managed fields from copy', () => {
    const testRecord = {
      id: '123',
      creation_date_utc: '2024-01-01T00:00:00Z',
      last_updated_utc: '2024-01-02T00:00:00Z',
      file_number: 42,
      episode_title: 'Test Episode',
      media_type: 'video',
      production_year: 2024,
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    expect(mockRedirect).toHaveBeenCalled();
    const redirectCall = mockRedirect.mock.calls[0];
    const stateData = redirectCall[4]?.record;

    // System fields should be excluded
    expect(stateData).not.toHaveProperty('id');
    expect(stateData).not.toHaveProperty('creation_date_utc');
    expect(stateData).not.toHaveProperty('last_updated_utc');
    expect(stateData).not.toHaveProperty('file_number');

    // Other fields should be included
    expect(stateData).toHaveProperty('episode_title', 'Test Episode');
    expect(stateData).toHaveProperty('media_type', 'video');
    expect(stateData).toHaveProperty('production_year', 2024);
  });

  test('excludes nested API objects from copy', () => {
    const testRecord = {
      id: '123',
      episode_title: 'Test Episode',
      actor_ids: ['actor-1', 'actor-2'],
      actors: [
        { id: 'actor-1', stage_name_roman: 'Actor One' },
        { id: 'actor-2', stage_name_roman: 'Actor Two' },
      ],
      director_ids: ['director-1'],
      directors: [
        { id: 'director-1', stage_name_roman: 'Director One' },
      ],
      people_roles: [
        { role: 'actor', public_person_id: 'actor-1' },
      ],
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    const redirectCall = mockRedirect.mock.calls[0];
    const stateData = redirectCall[4]?.record;

    // ID arrays should be included
    expect(stateData).toHaveProperty('actor_ids');
    expect(stateData.actor_ids).toEqual(['actor-1', 'actor-2']);
    expect(stateData).toHaveProperty('director_ids');
    expect(stateData.director_ids).toEqual(['director-1']);

    // Nested objects should be excluded
    expect(stateData).not.toHaveProperty('actors');
    expect(stateData).not.toHaveProperty('directors');
    expect(stateData).not.toHaveProperty('people_roles');
  });

  test('transforms datetime fields to date-only format', () => {
    const testRecord = {
      id: '123',
      episode_title: 'Test Episode',
      contract_start_date_utc: '2024-01-01T00:00:00Z',
      contract_end_date_utc: '2024-12-31T23:59:59Z',
      original_broadcast_date_utc: '2024-06-15T14:30:00Z',
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    const redirectCall = mockRedirect.mock.calls[0];
    const stateData = redirectCall[4]?.record;

    // Date fields should be in YYYY-MM-DD format
    expect(stateData.contract_start_date_utc).toBe('2024-01-01');
    expect(stateData.contract_end_date_utc).toBe('2024-12-31');
    expect(stateData.original_broadcast_date_utc).toBe('2024-06-15');
  });

  test('transforms array fields to comma-separated strings', () => {
    const testRecord = {
      id: '123',
      episode_title: 'Test Episode',
      tags: ['drama', 'romance', 'comedy'],
      seo_keywords_text_list: ['keyword1', 'keyword2', 'keyword3'],
      hashtags_text_list: ['#drama', '#romance', '#comedy'],
      human_keywords_text_list: ['love', 'story', 'family'],
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    const redirectCall = mockRedirect.mock.calls[0];
    const stateData = redirectCall[4]?.record;

    // Array fields should be converted to comma-separated strings
    expect(stateData.tags).toBe('drama, romance, comedy');
    expect(stateData.seo_keywords_text_list).toBe('keyword1, keyword2, keyword3');
    expect(stateData.hashtags_text_list).toBe('#drama, #romance, #comedy');
    expect(stateData.human_keywords_text_list).toBe('love, story, family');
  });

  test('keeps string fields as-is when already strings', () => {
    const testRecord = {
      id: '123',
      episode_title: 'Test Episode',
      tags: 'drama, romance, comedy',
      seo_keywords_text_list: 'keyword1, keyword2',
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    const redirectCall = mockRedirect.mock.calls[0];
    const stateData = redirectCall[4]?.record;

    // String fields should remain as strings
    expect(stateData.tags).toBe('drama, romance, comedy');
    expect(stateData.seo_keywords_text_list).toBe('keyword1, keyword2');
  });

  test('converts empty arrays to null instead of empty strings', () => {
    const testRecord = {
      id: '123',
      episode_title: 'Test Episode',
      tags: [],
      seo_keywords_text_list: [],
      hashtags_text_list: [],
      human_keywords_text_list: [],
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    const redirectCall = mockRedirect.mock.calls[0];
    const stateData = redirectCall[4]?.record;

    // Empty arrays should be converted to null, not empty strings
    expect(stateData.tags).toBeNull();
    expect(stateData.seo_keywords_text_list).toBeNull();
    expect(stateData.hashtags_text_list).toBeNull();
    expect(stateData.human_keywords_text_list).toBeNull();
  });

  test('navigates to create page with copied data', () => {
    const testRecord = {
      id: '123',
      episode_title: 'Test Episode',
      media_type: 'video',
      production_year: 2024,
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    expect(mockRedirect).toHaveBeenCalledWith(
      '/media-descriptions/create',
      undefined,
      undefined,
      undefined,
      expect.objectContaining({
        record: expect.objectContaining({
          episode_title: 'Test Episode',
          media_type: 'video',
          production_year: 2024,
        }),
      })
    );
  });

  test('shows notification when copy is initiated', () => {
    const testRecord = {
      id: '123',
      episode_title: 'Test Episode',
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    expect(mockNotify).toHaveBeenCalledWith(
      'Media description copied. Review and save to create.',
      { type: 'info' }
    );
  });

  test('shows warning when no record is available', () => {
    mockUseRecordContext.mockReturnValue(null);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    expect(mockNotify).toHaveBeenCalledWith(
      'No record to copy',
      { type: 'warning' }
    );
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test('preserves all reference ID arrays', () => {
    const testRecord = {
      id: '123',
      episode_title: 'Test Episode',
      actor_ids: ['actor-1', 'actor-2'],
      director_ids: ['director-1'],
      producer_ids: ['producer-1', 'producer-2', 'producer-3'],
      author_ids: ['author-1'],
      origin_country_ids: ['country-1'],
      available_country_ids: ['country-1', 'country-2'],
      original_language_ids: ['lang-1'],
      available_subtitle_language_ids: ['lang-1', 'lang-2'],
      available_audio_language_ids: ['lang-1'],
      audience_category_ids: ['cat-1', 'cat-2'],
      eligible_plan_ids: ['plan-1'],
      media_theme_ids: ['theme-1', 'theme-2'],
      trailer_ids: ['trailer-1'],
      excerpt_ids: ['excerpt-1', 'excerpt-2'],
      additional_image_ids: ['image-1', 'image-2', 'image-3'],
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    const redirectCall = mockRedirect.mock.calls[0];
    const stateData = redirectCall[4]?.record;

    // All ID arrays should be preserved
    expect(stateData.actor_ids).toEqual(['actor-1', 'actor-2']);
    expect(stateData.director_ids).toEqual(['director-1']);
    expect(stateData.producer_ids).toEqual(['producer-1', 'producer-2', 'producer-3']);
    expect(stateData.author_ids).toEqual(['author-1']);
    expect(stateData.origin_country_ids).toEqual(['country-1']);
    expect(stateData.available_country_ids).toEqual(['country-1', 'country-2']);
    expect(stateData.original_language_ids).toEqual(['lang-1']);
    expect(stateData.available_subtitle_language_ids).toEqual(['lang-1', 'lang-2']);
    expect(stateData.available_audio_language_ids).toEqual(['lang-1']);
    expect(stateData.audience_category_ids).toEqual(['cat-1', 'cat-2']);
    expect(stateData.eligible_plan_ids).toEqual(['plan-1']);
    expect(stateData.media_theme_ids).toEqual(['theme-1', 'theme-2']);
    expect(stateData.trailer_ids).toEqual(['trailer-1']);
    expect(stateData.excerpt_ids).toEqual(['excerpt-1', 'excerpt-2']);
    expect(stateData.additional_image_ids).toEqual(['image-1', 'image-2', 'image-3']);
  });

  test('preserves all single reference IDs and text fields', () => {
    const testRecord = {
      id: '123',
      episode_title: 'Test Episode',
      program_id: 'program-1',
      season_id: 'season-1',
      main_video_file_id: 'video-1',
      image_1920_1080_id: 'image-1',
      image_1920_720_id: 'image-2',
      image_1080_1080_id: 'image-3',
      image_810_1080_id: 'image-4',
      image_1080_1920_id: 'image-5',
      image_mobile_home: 'image-6',
      image_desktop_home: 'image-7',
      rights_holder: 'ABC Studios',
      copyright_owner_text: 'ABC Corp',
      seo_title: 'Test SEO Title',
      seo_description: 'Test SEO Description',
      slug: 'test-episode',
      friendly_url: '/test-episode',
      external_identifier_text: 'EXT-123',
      is_featured: true,
      content_status: 'published',
      media_type: 'video',
      production_year: 2024,
      episode_number: 5,
      translation_share: 10.5,
      sacem_share: 5.25,
      other_share: 3.75,
      revenue_share: 80.5,
      paid_token_cost: 100,
    };

    mockUseRecordContext.mockReturnValue(testRecord);

    render(<CopyMediaDescriptionButton />);
    const button = screen.getByTestId('copy-button');
    fireEvent.click(button);

    const redirectCall = mockRedirect.mock.calls[0];
    const stateData = redirectCall[4]?.record;

    // All single reference IDs should be preserved
    expect(stateData.program_id).toBe('program-1');
    expect(stateData.season_id).toBe('season-1');
    expect(stateData.main_video_file_id).toBe('video-1');
    expect(stateData.image_1920_1080_id).toBe('image-1');
    expect(stateData.image_1920_720_id).toBe('image-2');
    expect(stateData.image_1080_1080_id).toBe('image-3');
    expect(stateData.image_810_1080_id).toBe('image-4');
    expect(stateData.image_1080_1920_id).toBe('image-5');
    expect(stateData.image_mobile_home).toBe('image-6');
    expect(stateData.image_desktop_home).toBe('image-7');

    // All text fields should be preserved
    expect(stateData.episode_title).toBe('Test Episode');
    expect(stateData.rights_holder).toBe('ABC Studios');
    expect(stateData.copyright_owner_text).toBe('ABC Corp');
    expect(stateData.seo_title).toBe('Test SEO Title');
    expect(stateData.seo_description).toBe('Test SEO Description');
    expect(stateData.slug).toBe('test-episode');
    expect(stateData.friendly_url).toBe('/test-episode');
    expect(stateData.external_identifier_text).toBe('EXT-123');

    // Boolean and enum fields should be preserved
    expect(stateData.is_featured).toBe(true);
    expect(stateData.content_status).toBe('published');
    expect(stateData.media_type).toBe('video');

    // Numeric fields should be preserved
    expect(stateData.production_year).toBe(2024);
    expect(stateData.episode_number).toBe(5);
    expect(stateData.translation_share).toBe(10.5);
    expect(stateData.sacem_share).toBe(5.25);
    expect(stateData.other_share).toBe(3.75);
    expect(stateData.revenue_share).toBe(80.5);
    expect(stateData.paid_token_cost).toBe(100);
  });
});
