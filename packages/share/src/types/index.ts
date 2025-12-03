// API Types based on backend models
export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  creation_date_utc: string;
  subscription_plans_id_list?: string[];  // v1.12 new field
}

export type MediaCategory = ('movie' | 'drama' | 'short-drama' | 'short-film' | 'musical' | 'animation' | 'documentary' | 'tvshow' | 'web-drama' | 'other')  

export interface MediaDescription {
  id: string;
  creation_date_utc: string;
  file_number: number;
  episode_title: string;
  media_type: 'video' | 'excerpt' | 'trailer' | 'webtoon' | 'season' | 'program';
  expected_filename?: string;
  main_video_file_id?: string;
  program_id?: string;
  season_id?: string;
  episode_number?: number;

  // Content categorization - API 1.13
  media_categories_list?: MediaCategory[];
  content_status?: 'draft' | 'published' | 'archived' | 'scheduled';
  is_featured?: boolean;

  // Content details
  descriptive_summary_text?: string;
  synopsis_text?: string;
  production_year?: number;
  original_broadcast_date_utc?: string;
  last_updated_utc?: string;
  duration_seconds?: number;

  // SEO & Marketing - API 1.13
  seo_title?: string;
  seo_description?: string;
  seo_keywords_text_list?: string[];
  hashtags_text_list?: string[];
  friendly_url?: string;
  slug?: string;
  human_keywords_text_list?: string[];

  // Rights & Business - API 1.13
  contract_start_date_utc?: string;
  contract_end_date_utc?: string;
  rights_holder?: string;
  copyright_owner_text?: string;
  revenue_share?: number;
  translation_share?: number;
  sacem_share?: number;
  other_share?: number;
  paid_token_cost?: number;

  // Legacy fields
  external_identifier_text?: string;
  
  // Person role fields (DEPRECATED - use relationship objects instead)
  /** @deprecated Use actors relationship object instead */
  actors_id_list?: string[];
  /** @deprecated Use directors relationship object instead */
  directors_id_list?: string[];
  /** @deprecated Use producers relationship object instead */
  productors_id_list?: string[];
  /** @deprecated Use authors relationship object instead */
  authors_id_list?: string[];
  /** @deprecated Use origin_countries relationship object instead */
  origin_country_id_list?: string[];
  /** @deprecated Use original_languages relationship object instead */
  original_languages_id?: string[];
  /** @deprecated Use available_countries relationship object instead */
  available_countries_list?: string[];
  
  // Image fields - API 1.13
  image_1920_1080_id?: string;
  image_1920_720_id?: string;
  image_1080_1080_id?: string;
  image_810_1080_id?: string;
  image_1080_1920_id?: string;
  /** @deprecated Use additional_images relationship object instead */
  additional_images_id_list?: string[];

  // Test image fields (legacy)
  image_fullscreen?: string;
  image_thumbnail1?: string;
  image_thumbnail2?: string;
  image_mobile_home?: string;
  image_desktop_home?: string;
  
  // v1.12 fields (DEPRECATED - use relationship objects instead)
  /** @deprecated Use media_themes relationship object instead */
  /** @deprecated Use media_themes relationship object instead */
  media_themes_id_list?: string[];
  /** @deprecated Use available_countries relationship object instead */
  available_countries_id_list?: string[];
  /** @deprecated Use audience_categories relationship object instead */
  audience_categories_id_list?: string[];
  /** @deprecated Use eligible_plan_id_list relationship object instead */
  eligible_plan_ids?: string[];
  
  // v1.10-C additional fields
  audio_languages_available?: string[];
  subtitle_languages_available?: string[];
  distribution_territories?: string[];
  source_platform?: string;
  original_language?: string;
  content_warning?: string;
  rating_system?: string;
  trailer_url?: string;
  secondary_thumbnail_url?: string;
  /** @deprecated Use image_1920_1080_url instead (fetched from image_1920_1080_id) */
  main_thumbnail_url?: string;

  // Computed fields (fetched on-demand)
  image_1920_1080_url?: string;
  // public_person_id_list removed in v1.12
  audience_category_id?: string;
  // media_categories_id_list removed in v1.12 (replaced by media_categories_list)
  is_premium_content?: boolean;

  // Diagnostics field
  diagnostics?: string;

  // Fields consolidated above - no duplicates needed here
  
  // API 1.13 Relationship arrays (for create/update requests)
  actor_ids?: string[];
  director_ids?: string[];
  producer_ids?: string[];
  author_ids?: string[];
  origin_country_ids?: string[];
  available_country_ids?: string[];
  original_language_ids?: string[];
  available_subtitle_language_ids?: string[];
  available_audio_language_ids?: string[];
  media_theme_ids?: string[];
  audience_category_ids?: string[];
  trailer_ids?: string[];
  excerpt_ids?: string[];
  additional_image_ids?: string[];

  // API 1.13 Relationship objects (returned by backend in responses)
  actors?: PublicPersonSimple[];
  directors?: PublicPersonSimple[];
  producers?: PublicPersonSimple[];
  authors?: PublicPersonSimple[];
  origin_countries?: CountrySimple[];
  available_countries?: CountrySimple[];
  original_languages?: LanguageSimple[];
  available_subtitle_languages?: LanguageSimple[];
  available_audio_languages?: LanguageSimple[];
  audience_categories?: AudienceCategorySimple[];
  eligible_plans?: SubscriptionPlanSimple[];
  media_themes?: MediaThemeSimple[];
  additional_images?: PictureSimple[];
  trailers?: VideoFileSimple[];
  excerpts?: VideoFileSimple[];

  // API 1.13 People roles with positions
  people_roles?: PersonRole[];
}

export interface VideoFile {
  id: string;
  creation_date_utc?: string;

  // Core fields - API 1.13
  file_name?: string;
  file_url?: string;
  file_size_bytes?: number;
  duration_seconds?: number;

  // Upload & Processing - API 1.13
  upload_status: 'metadata_only' | 'file_uploading' | 'upload_completed' | 'upload_failed';
  encoding_status: 'pending' | 'processing' | 'completed' | 'failed';
  upload_timestamp?: string;
  encodage_date_utc?: string;

  // Technical metadata - API 1.13
  video_codec?: string;
  audio_codec?: string;
  file_format?: string;
  bitrate_kbps?: number;
  max_resolution_width?: number;
  max_resolution_height?: number;
  frame_rate?: number;
  aspect_ratio?: string;
  audio_sample_rate?: number;

  // Mux integration - API 1.13
  mux_asset_id?: string;
  mux_playback_id?: string;
  drm_protection?: boolean;
  playback_policy?: string;

  // Localization - API 1.13
  subtitle_tracks_text_list?: string[];
  audio_languages?: LanguageSimple[];

  // Business - API 1.13
  encoding_profile?: string;
  external_url?: string;
  media_description_id?: string;

  // Legacy fields
  environment_key?: string;
  slug?: string;
  subtitle_tracks?: string[];
  resolutions_list?: string[];
  accessibilities_list?: string[];
  audio_languages_id_list?: string[];

  // Diagnostics field
  diagnostics?: string;
}

export interface VideoFileSimple {
  id: string;
  file_name?: string;
  file_url?: string;
  duration_seconds?: number;
  encoding_status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Simple relationship object types (matching backend Pydantic schemas)
export interface PublicPersonSimple {
  id: string;
  stage_name_roman: string;
}

export interface CountrySimple {
  id: string;
  name: string;
}

export interface LanguageSimple {
  id: string;
  name: string;
  sigle: string;
}

export interface AudienceCategorySimple {
  id: string;
  name: string;
}

export interface SubscriptionPlanSimple {
  id: string;
  name: string;
}

export interface MediaThemeSimple {
  id: string;
  name: string;
}

export interface MediaDescriptionSimple {
  id: string;
  episode_title: string;
  media_type: string;
  friendly_url?: string;
  slug?: string;
  is_featured?: boolean;
}

export interface PictureSimple {
  id: string;
  image_url: string;
  large_image_url?: string;
  small_image_url?: string;
  file_name?: string;
  alt_text?: string;
}

export interface PublicPerson {
  id: string;
  creation_date_utc: string;
  // Required field in API 1.13
  stage_name_roman: string;
  // Optional name fields - API 1.13
  stage_name_local?: string;
  real_name_roman?: string;
  real_name_local?: string;
  biography_text?: string;
  birth_date?: string;
  country_of_origin_id?: string;
  profile_image_id?: string;
  // Relationships - API 1.13
  country_of_origin?: CountrySimple;
  profile_image?: PictureSimple;
  // Legacy fields
  first_name_hangul?: string | null;
  last_name_hangul?: string | null;
  first_name_roman?: string | null;
  last_name_roman?: string | null;
  stage_name_hangul?: string | null;
  profession_list?: string[] | null;
  face_image_id?: string | null;
}

// API 1.13 New types
export interface PersonRole {
  person_id: string;
  person: PublicPersonSimple;
  role: 'actor' | 'director' | 'producer' | 'author';
  position?: string;
}

export interface MediaShowcase {
  id: string;
  creation_date_utc?: string;
  last_updated_utc?: string;
  title: string;
  description?: string;
  thumbnail_format: ThumbnailFormatEnum;
  is_active: boolean;
  priority_in_screen: number;
  list_type: ListTypeEnum;
  percentage_width: number;
  percentage_height: number;
  media_type?: string;
  media_categories_list?: string[];
  latest_first?: boolean;
  slug?: string;
  relative_url_link?: string;
  // Relationship arrays - now included in API response
  media_descriptions?: MediaDescriptionSimple[];
  media_themes?: MediaThemeSimple[];
  // JSON cache fields
  json_content?: string;
  json_last_updated?: string;
}

// v1.4 new models
export interface Program {
  id: string;
  creation_date_utc: string;
  program_name: string;
  general_media_description_id?: string;
}

export interface Season {
  id: string;
  creation_date_utc: string;
  season_name: string;  // API 1.13: season name field
  season_number: number;
  program_id?: string;  // API 1.13: optional parent program
  general_media_description_id?: string;  // Link to season's general media description
  // Relationships
  program?: Program;
  media_descriptions?: MediaDescription[];
}

// Season JSON Cache Types

export interface SeasonEpisodeItemJSON {
  id: string;
  title: string;
  media_type: string;
  friendly_url?: string;
  slug?: string;
  media_categories_list?: string[];
  descriptive_summary_text?: string;
  is_featured: boolean;
  program_id?: string;
  season_id?: string;
  episode_number?: number;
  episode_order: number;  // Order within the season
  // Picture format URLs for all 5 supported formats
  image_1920_1080_url?: string;
  image_1920_720_url?: string;
  image_1080_1080_url?: string;
  image_810_1080_url?: string;
  image_1080_1920_url?: string;
}

export interface SeasonJSON {
  id: string;
  season_number: number;
  season_name?: string;
  program_id?: string;
  creation_date_utc: string;
  last_updated: string;
  episode_count: number;
  general_description?: SeasonEpisodeItemJSON;
  episodes: SeasonEpisodeItemJSON[];
}

export interface SeasonBulkRefreshResponse {
  message: string;
  refreshed_count: number;
  failed_count: number;
  total_count: number;
  errors: string[];
}

// Program JSON Cache Types

export interface ProgramJSON {
  id: string;
  program_name: string;
  creation_date_utc: string;
  last_updated: string;
  season_count: number;
  general_description?: SeasonEpisodeItemJSON;  // Reuse MediaDescription JSON structure
  seasons: SeasonJSON[];  // Nested complete season JSONs
}

export interface ProgramBulkRefreshResponse {
  message: string;
  refreshed_count: number;
  failed_count: number;
  total_count: number;
  errors: string[];
}

export interface Language {
  id: string;
  creation_date_utc: string;
  name: string;
  sigle: string;
}

export interface Country {
  id: string;
  creation_date_utc?: string;
  name: string;
  sigle: string;  // API 1.13: country code/abbreviation
}

export interface Territory {
  id: string;
  creation_date_utc: string;
  name: string;
  country_id?: string;
}

export interface Picture {
  id: string;
  creation_date_utc: string;
  image_url: string;
  large_image_url?: string;
  small_image_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  alt_text?: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

// API Response types
export type OrderDirection = 'asc' | 'desc';

export interface PaginationInfo {
  skip: number;
  limit: number;
  total: number;
  page: number;
  pages: number;
  total_pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  order_by?: string | null;
  order_dir?: OrderDirection;
}

// Generic paginated response type
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// API parameter types
export interface BaseApiParams {
  skip?: number;
  limit?: number;
  order_by?: string;
  order_dir?: OrderDirection;
}

export interface CountriesApiParams extends BaseApiParams {
  q?: string;
}

export interface LanguagesApiParams extends BaseApiParams {
  q?: string;
}

export interface TerritoriesApiParams extends BaseApiParams {
  country_id?: string;
  q?: string;
}

export interface PicturesApiParams extends BaseApiParams {
  q?: string;
}

export interface ProgramsApiParams extends BaseApiParams {
  q?: string;
}

export interface SeasonsApiParams extends BaseApiParams {
  program_id?: string;
  q?: string;
}

export interface PersonsApiParams extends BaseApiParams {
  profession?: string;
  q?: string;
}

export interface UsersApiParams extends BaseApiParams {
  is_active?: boolean;
  is_admin?: boolean;
  q?: string;
}

export interface AudienceCategoriesApiParams extends BaseApiParams {
  q?: string;
}

export interface SubscriptionPlansApiParams extends BaseApiParams {
  q?: string;
}

// Specific response types
export interface PaginatedCountriesResponse extends PaginatedResponse<Country> {}
export interface PaginatedLanguagesResponse extends PaginatedResponse<Language> {}
export interface PaginatedTerritoriesResponse extends PaginatedResponse<Territory> {}
export interface PaginatedPicturesResponse extends PaginatedResponse<Picture> {}
export interface PaginatedProgramsResponse extends PaginatedResponse<Program> {}
export interface PaginatedSeasonsResponse extends PaginatedResponse<Season> {}
export interface PaginatedPersonsResponse extends PaginatedResponse<PublicPerson> {}
export interface PaginatedUsersResponse extends PaginatedResponse<User> {}
export interface PaginatedAudienceCategoriesResponse extends PaginatedResponse<AudienceCategory> {}
export interface PaginatedSubscriptionPlansResponse extends PaginatedResponse<SubscriptionPlan> {}

export interface MediaDescriptionListResponse extends PaginatedResponse<MediaDescription> {}
export interface VideoFileListResponse extends PaginatedResponse<VideoFile> {}

// Filter types
export interface MediaFilters {
  skip?: number;
  limit?: number;
  q?: string;
  media_type?: string;
  category_id?: string;
  status?: string;
  is_featured?: boolean;
  is_premium?: boolean;
  season_id?: string;
  program_id?: string;
  order_by?: string;
  order_dir?: OrderDirection;
}

export interface VideoFileFilters {
  skip?: number;
  limit?: number;
  q?: string;
  media_description_id?: string;
  encoding_status?: 'pending' | 'processing' | 'completed' | 'failed';
  order_by?: string;
  order_dir?: OrderDirection;
}

// v1.9 new interfaces for video file operations
export interface VideoFileCreate {
  file_url?: string;
  file_name: string;
  file_size_bytes?: number;
  encoding_status?: 'pending' | 'processing' | 'completed' | 'failed';
  upload_status?: 'metadata_only' | 'file_uploading' | 'upload_completed' | 'upload_failed' | 'ready_no_subtitles';
  upload_timestamp?: string;
  external_url?: string;
  encodage_date_utc?: string;
  duration_seconds?: number;
  max_resolution_width?: number;
  max_resolution_height?: number;
  bitrate_kbps?: number;
  frame_rate?: number;
  aspect_ratio?: string;
  audio_sample_rate?: number;
  subtitle_tracks?: string[];
  encoding_profile?: string;
  mux_asset_id?: string;
  mux_playback_id?: string;
  drm_protection?: boolean;
  environment_key?: string;
  slug?: string;
  playback_policy?: string;
  subtitle_tracks_text_list?: string[];
  resolutions_list?: string[];
  accessibilities_list?: string[];
  audio_languages_id_list?: string[];
}

export interface VideoFileUpdate {
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  encoding_status?: 'pending' | 'processing' | 'completed' | 'failed';
  upload_status?: 'metadata_only' | 'file_uploading' | 'upload_completed' | 'upload_failed' | 'ready_no_subtitles';
  upload_timestamp?: string;
  external_url?: string;
  encodage_date_utc?: string;
  duration_seconds?: number;
  max_resolution_width?: number;
  max_resolution_height?: number;
  bitrate_kbps?: number;
  frame_rate?: number;
  aspect_ratio?: string;
  audio_sample_rate?: number;
  subtitle_tracks?: string[];
  encoding_profile?: string;
  mux_asset_id?: string;
  mux_playback_id?: string;
  drm_protection?: boolean;
  environment_key?: string;
  slug?: string;
  playback_policy?: string;
  subtitle_tracks_text_list?: string[];
  resolutions_list?: string[];
  accessibilities_list?: string[];
  audio_languages_id_list?: string[];
}

// Description Report types
export interface DescriptionReport {
  id: string;
  description_id: string;
  title: string;
  success_associated_file: boolean;
  timestamp: string;
  batch_id?: string;
}

export interface DescriptionReportListResponse extends PaginatedResponse<DescriptionReport> {}

// Bulk creation types
export interface MediaDescriptionCreate {
  file_number: number;
  episode_title: string;
  media_type: 'video' | 'webtoon' | 'trailer' | 'excerpt' | 'season' | 'program';
  file_name?: string;
  expected_filename?: string;
  program_id?: string;
  season_id?: string;
  episode_number?: number;
  // v1.12: replaced media_categories_id_list with media_categories_list (enum values)
  media_categories_list?: string[];
  // v1.12: replaced themes_and_genres_id_list with media_themes_id_list
  /** @deprecated Use media_themes relationship object instead */
  media_themes_id_list?: string[];
  descriptive_summary_text?: string;
  synopsis_text?: string;
  contract_start_date_utc?: string;
  contract_end_date_utc?: string;
  production_year?: number;
  original_broadcast_date_utc?: string;
  duration_seconds?: number;
  audience_category_id?: string;
  subscription_plan_id_list?: string[];
  // public_person_id_list removed in v1.12
  main_thumbnail_url?: string;
  secondary_thumbnail_url?: string;
  trailer_url?: string;
  rating_system?: string;
  content_warning?: string;
  original_language?: string;
  subtitle_languages_available?: string[];
  audio_languages_available?: string[];
  is_premium_content?: boolean;
  is_featured?: boolean;
  content_status?: 'draft' | 'published' | 'archived' | 'scheduled';
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  social_media_hashtags?: string[];
  external_id?: string;
  source_platform?: string;
  rights_holder?: string;
  distribution_territories?: string[];
  // v1.4 new fields
  actors_id_list?: string[];
  directors_id_list?: string[];
  productors_id_list?: string[];
  authors_id_list?: string[];
  origin_country_id_list?: string[];
  original_languages_id?: string[];
  available_countries_list?: string[];
  copyright_owner_id?: string;
  eligible_plans?: string[];
  audience_categories_id_list?: string[];
  image_fullscreen?: string;
  image_thumbnail1?: string;
  image_thumbnail2?: string;
  image_mobile_home?: string;
  image_desktop_home?: string;
  additional_images_id_list?: string[];
  // v1.10 sized image fields
  image_1920_1080_id?: string;
  image_1920_720_id?: string;
  image_1080_1080_id?: string;
  image_810_1080_id?: string;
  image_1080_1920_id?: string;
  // v1.9 breaking changes
  tag_text_list?: string[]; // renamed from human_keywords_text_list
  slug?: string; // renamed from friendly_url
  translation_share?: number;
  sacem_share?: number;
  other_share?: number;
  revenue_share?: number;
  paid_token_cost?: number;
  // v1.12 new fields
  available_countries_id_list?: string[];
  eligible_plan_ids?: string[];
}

// v1.4 new create/update interfaces
export interface ProgramCreate {
  program_name: string;
  general_media_description_id?: string;
}

export interface ProgramUpdate {
  program_name?: string;
  general_media_description_id?: string;
}

export interface SeasonCreate {
  program_id?: string;  // v1.12: now optional
  season_number: number;
  season_name?: string;
  general_media_description_id?: string;
}

export interface SeasonUpdate {
  program_id?: string;  // v1.12: now optional
  season_number?: number;
  season_name?: string;
  general_media_description_id?: string;
}

export interface LanguageCreate {
  name: string;
  sigle: string;
}

export interface LanguageUpdate {
  name?: string;
  sigle?: string;
}

export interface CountryCreate {
  name: string;
}

export interface CountryUpdate {
  name?: string;
}

export interface TerritoryCreate {
  name: string;
  country_id?: string;
}

export interface TerritoryUpdate {
  name?: string;
  country_id?: string;
}

export interface PictureCreate {
  image_url: string;
  large_image_url?: string;
  small_image_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  alt_text?: string;
}

export interface PictureUpdate {
  image_url?: string;
  large_image_url?: string;
  small_image_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  alt_text?: string;
}

// Audience Category interfaces
export interface AudienceCategory {
  id: string;
  name: string;
  creation_date_utc: string;
}

export interface AudienceCategoryCreate {
  name: string;
}

export interface AudienceCategoryUpdate {
  name?: string;
}

// Subscription Plan interfaces
export interface SubscriptionPlan {
  id: string;
  name: string;
  creation_date_utc: string;
}

export interface SubscriptionPlanCreate {
  name: string;
}

export interface SubscriptionPlanUpdate {
  name?: string;
}

// v1.12 new MediaTheme interfaces
export interface MediaTheme {
  id: string;
  name: string;
  creation_date_utc: string;
}

export interface MediaThemeCreate {
  name: string;
}

export interface MediaThemeUpdate {
  name?: string;
}

export interface MediaThemeApiParams extends BaseApiParams {
  q?: string;
}

export interface PaginatedMediaThemesResponse extends PaginatedResponse<MediaTheme> {}

export interface PublicPersonCreate {
  // Required field in v1.5
  stage_name_roman: string;
  // Optional name fields (v1.5)
  first_name_hangul?: string | null;
  last_name_hangul?: string | null;
  first_name_roman?: string | null;
  last_name_roman?: string | null;
  stage_name_hangul?: string | null;
  // v1.5 fields
  profession_list?: string[] | null;
  face_image_id?: string | null;
}

export interface PublicPersonUpdate {
  // All fields optional for updates in v1.5
  stage_name_roman?: string;
  first_name_hangul?: string | null;
  last_name_hangul?: string | null;
  first_name_roman?: string | null;
  last_name_roman?: string | null;
  stage_name_hangul?: string | null;
  profession_list?: string[] | null;
  face_image_id?: string | null;
}

export interface BulkMediaDescriptionRequest {
  descriptions: MediaDescriptionCreate[];
}

export interface BulkMediaDescriptionResponse {
  created_count: number;
  failed_count: number;
  batch_id: string;
  reports: DescriptionReport[];
}

// Excel parsing types
export interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

export interface ExcelParseResult {
  data: MediaDescriptionCreate[];
  errors: {
    row: number;
    message: string;
  }[];
}

// Video File Report types
export interface VideoFileReport {
  id: string;
  video_file_id?: string;
  video_file_name: string;
  video_file_url?: string;
  file_size?: string;
  duration?: string;
  media_description_id?: string;
  media_description_title?: string;
  event: string;
  timestamp: string;
  additional_info?: string;
}

export interface VideoFileReportListResponse extends PaginatedResponse<VideoFileReport> {}

export interface VideoFileReportParams {
  skip?: number;
  limit?: number;
  event?: string;
}

// Category List types
export interface CategoryListItem {
  id: string;
  title: string;
  display_order: number;
  is_active: boolean;
  size_width?: number;
  size_height?: number;
  forward_link?: string;
  media_description_id?: string;
  category_list_id: string;
  creation_date_utc: string;
  last_updated_utc: string;
  media_title?: string;
  media_type?: string;
  thumbnail_url?: string;
}

export interface CategoryList {
  id: string;
  name: string;
  title: string;
  description?: string;
  is_active: boolean;
  display_order: number;
  creation_date_utc: string;
  last_updated_utc: string;
  json_last_updated?: string;
  items: CategoryListItem[];
}

export interface CategoryListWithItemCount {
  id: string;
  name: string;
  title: string;
  description?: string;
  is_active: boolean;
  display_order: number;
  creation_date_utc: string;
  last_updated_utc: string;
  json_last_updated?: string;
  item_count: number;
}

export interface CategoryListJSON {
  id: string;
  name: string;
  title: string;
  description?: string;
  is_active: boolean;
  display_order: number;
  last_updated?: string;
  items: CategoryListItemJSON[];
}

export interface CategoryListItemJSON {
  id: string;
  title: string;
  display_order: number;
  size_width?: number;
  size_height?: number;
  media_description_id?: string;
  thumbnail_url?: string;
  forward_link?: string;
  media_title?: string;
  media_type?: string;
}

// v1.6 New Types - Updated to dimension-based naming
export type ThumbnailFormatEnum = '1920x1080' | '1920x720' | '1080x1080' | '810x1080' | '1080x1920';

export type ListTypeEnum = 'classic' | 'carousel' | 'hero' | 'field' | 'ranking';

export interface ContentList {
  id: string;
  creation_date_utc: string;
  last_updated_utc: string;
  title: string;
  thumbnail_format: ThumbnailFormatEnum;
  is_active: boolean;
  display_order: number;
  list_type: ListTypeEnum; // Required field
  percentage_width: number; // Required field (0-100)
  percentage_height: number; // Required field (0-100)
  latest_first: boolean; // v1.9 new required field
  description?: string;
  /** @deprecated Replaced with polymorphic relationship system - functionality needs rewrite */
  content_items?: string[];
  /** @deprecated Replaced with polymorphic relationship system - functionality needs rewrite */
  content_types?: string[];
  // v1.9 new filtering fields
  media_type?: 'video' | 'webtoon' | 'trailer' | 'excerpt';
  // v1.12: replaced media_categories_id_list with media_categories_list (enum values)
  media_categories_list?: string[];
  // v1.12: replaced themes_and_genres_id_list with media_themes_id_list
  /** @deprecated Use media_themes relationship object instead */
  media_themes_id_list?: string[];
  slug?: string; // v1.9 new field
  json_content?: string;
  json_last_updated?: string;
}

export interface ContentListCreate {
  title: string;
  thumbnail_format: ThumbnailFormatEnum;
  is_active: boolean;
  display_order: number;
  list_type: ListTypeEnum; // Required field
  percentage_width: number; // Required field (0-100)
  percentage_height: number; // Required field (0-100)
  latest_first: boolean; // v1.9 new required field
  description?: string;
  /** @deprecated Replaced with polymorphic relationship system - functionality needs rewrite */
  content_items?: string[];
  /** @deprecated Replaced with polymorphic relationship system - functionality needs rewrite */
  content_types?: string[];
  // v1.9 new filtering fields
  media_type?: 'video' | 'webtoon' | 'trailer' | 'excerpt';
  // v1.12: replaced media_categories_id_list with media_categories_list (enum values)
  media_categories_list?: string[];
  // v1.12: replaced themes_and_genres_id_list with media_themes_id_list
  /** @deprecated Use media_themes relationship object instead */
  media_themes_id_list?: string[];
  slug?: string; // v1.9 new field
}

export interface ContentListUpdate {
  title?: string;
  thumbnail_format?: ThumbnailFormatEnum;
  is_active?: boolean;
  display_order?: number;
  list_type?: ListTypeEnum; // Optional field
  percentage_width?: number; // Optional field (0-100)
  percentage_height?: number; // Optional field (0-100)
  latest_first?: boolean; // v1.9 field
  description?: string;
  /** @deprecated Replaced with polymorphic relationship system - functionality needs rewrite */
  content_items?: string[];
  /** @deprecated Replaced with polymorphic relationship system - functionality needs rewrite */
  content_types?: string[];
  // v1.9 new filtering fields
  media_type?: 'video' | 'webtoon' | 'trailer' | 'excerpt';
  // v1.12: replaced media_categories_id_list with media_categories_list (enum values)
  media_categories_list?: string[];
  // v1.12: replaced themes_and_genres_id_list with media_themes_id_list
  /** @deprecated Use media_themes relationship object instead */
  media_themes_id_list?: string[];
  slug?: string; // v1.9 field
}

export interface ContentListJSON {
  id: string;
  title: string;
  thumbnail_format: ThumbnailFormatEnum;
  description?: string;
  width_percentage: number;
  height_percentage: number;
  is_active: boolean;
  display_order: number;
  last_updated: string;
  items: ContentListItemJSON[];
}

export interface ContentListItemJSON {
  content_id: string;
  content_type: 'program' | 'season' | 'media_description';
  title: string;
  thumbnail_url?: string;
  description?: string;
  short_summary?: string;
  image_alt_text: string;
  display_order: number;
}

// v1.9 Breaking change: ScreenContent renamed to ScreenDescription
export interface ScreenDescription {
  id: string;
  creation_date_utc: string;
  last_updated_utc: string;
  title: string;
  is_active: boolean;
  display_order: number;
  in_top_menu?: boolean;
  description?: string;
  media_showcases?: string[];
  screen_type?: string;
  slug?: string; // v1.9 new field
  json_content?: string;
  json_last_updated?: string;
}

// Keep ScreenContent as alias for backward compatibility
export interface ScreenContent extends ScreenDescription {}

// v1.9 Breaking change: ScreenContent renamed to ScreenDescription
export interface ScreenDescriptionCreate {
  title: string;
  is_active: boolean;
  display_order: number;
  in_top_menu?: boolean;
  description?: string;
  media_showcases?: string[];
  screen_type?: string;
  slug?: string; // v1.9 new field
}

// Keep ScreenContentCreate as alias for backward compatibility
export interface ScreenContentCreate extends ScreenDescriptionCreate {}

// v1.9 Breaking change: ScreenContent renamed to ScreenDescription
export interface ScreenDescriptionUpdate {
  title?: string;
  is_active?: boolean;
  display_order?: number;
  in_top_menu?: boolean;
  description?: string;
  media_showcases?: string[];
  screen_type?: string;
  slug?: string; // v1.9 new field
}

// Keep ScreenContentUpdate as alias for backward compatibility
export interface ScreenContentUpdate extends ScreenDescriptionUpdate {}

// v1.9 Breaking change: ScreenContent renamed to ScreenDescription
export interface ScreenDescriptionJSON {
  id: string;
  title: string;
  description?: string;
  screen_type?: string;
  in_top_menu: boolean;
  last_updated: string;
  media_showcases: MediaShowcaseJSON[];
  /** @deprecated Use media_showcases instead */
  content_lists?: ContentListJSON[];
}

// Keep ScreenContentJSON as alias for backward compatibility
export interface ScreenContentJSON extends ScreenDescriptionJSON {}

export interface ContentListFilters {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  thumbnail_format?: ThumbnailFormatEnum;
}

// v1.9 Breaking change: ScreenContent renamed to ScreenDescription
export interface ScreenDescriptionFilters {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  screen_type?: string;
}

// Keep ScreenContentFilters as alias for backward compatibility
export interface ScreenContentFilters extends ScreenDescriptionFilters {}

export interface ContentListListResponse extends PaginatedResponse<ContentList> {}

// Auto-generation response type
export interface AutoGenerationResponse {
  message: string;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  errors: string[];
}

// Dynamic list update response type
export interface DynamicListUpdateResponse {
  message: string;
  processed_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  errors: string[];
  screens_updated: number;
  screen_errors: string[];
}
// v1.9 Breaking change: ScreenContent renamed to ScreenDescription
export interface ScreenDescriptionListResponse extends PaginatedResponse<ScreenDescription> {}

// Keep ScreenContentListResponse as alias for backward compatibility
export interface ScreenContentListResponse extends PaginatedResponse<ScreenDescription> {}

export interface ReorderContentRequest {
  content_items: string[];
  content_types: string[];
}

export interface ReorderListsRequest {
  media_showcases: string[];
}

// Media Upload Types
export interface VideoUploadResponse {
  success: boolean;
  message: string;
  video_file_id: string;
  file_url: string;
  backend?: string;
  encoding_status: string;
  linked_to_media: boolean;
}

export interface WebcomicUploadResponse {
  success: boolean;
  message: string;
  files: WebcomicFileInfo[];
  total_pages: number;
  backend?: string;
  linked_to_media: boolean;
  chapter_number?: number;
}

export interface WebcomicFileInfo {
  id: string;
  file_url: string;
  file_name: string;
  page_number: number;
}

export interface StorageBackendsResponse {
  available_backends: string[];
  backend_details: Record<string, any>;
  media_type_routing: Record<string, any>;
}

export interface DeleteFileResponse {
  success: boolean;
  message: string;
}

// API 1.13 New Types and Interfaces

// Text-to-UUID conversion for media descriptions
export interface MediaDescriptionFromTextRequest {
  episode_title: string;
  media_type: 'video' | 'excerpt' | 'trailer' | 'webtoon' | 'season' | 'program';
  file_number?: number;
  program_name?: string;
  season_name?: string;
  actor_names?: string[];
  director_names?: string[];
  producer_names?: string[];
  author_names?: string[];
  theme_names?: string[];
  available_country_names?: string[];
  audience_category_names?: string[];
  original_language_names?: string[];
  available_subtitle_language_names?: string[];
  available_audio_language_names?: string[];
  image_1920_1080_filename?: string;
  // Additional optional fields
  descriptive_summary_text?: string;
  production_year?: number;
  is_featured?: boolean;
  content_status?: 'draft' | 'published' | 'archived' | 'scheduled';
}

// Playback token responses
export interface PlaybackTokenResponse {
  success: boolean;
  token: string;
  playback_url: string;
  playback_id: string;
  expires_in_minutes: number;
  expires_at: number;
}

export interface DrmTokenResponse {
  success: boolean;
  token: string;
  drm_key_id?: string;
  expires_in_minutes: number;
  expires_at: number;
}

export interface VideoTestResponse {
  success: boolean;
  playback_url?: string;
  error_message?: string;
  mux_playback_id?: string;
}

export interface TokenInfoResponse {
  token_type: 'playback' | 'drm';
  expires_at: number;
  is_expired: boolean;
  playback_id?: string;
  drm_key_id?: string;
}

// Enhanced video file creation for two-step upload
export interface VideoFileCreateMetadataRequest {
  file_name: string;
  external_url?: string;
}

export interface VideoFileCreateMetadataResponse {
  id: string;
  upload_url: string;
  upload_status: string;
  message: string;
}

export interface VideoFileCreateWithUrlRequest {
  file_name: string;
  external_url: string;
}

// Enhanced media showcase types
export interface MediaShowcaseCreate {
  title: string;
  description?: string;
  thumbnail_format: ThumbnailFormatEnum;
  is_active: boolean;
  priority_in_screen?: number;
  list_type: ListTypeEnum;
  percentage_width: number;
  percentage_height: number;
  media_type?: string;
  media_categories_list?: string[];
  latest_first?: boolean;
  slug?: string;
  relative_url_link?: string;
  media_description_ids?: string[];
  media_theme_ids?: string[];
}

export interface MediaShowcaseUpdate {
  title?: string;
  description?: string;
  thumbnail_format?: ThumbnailFormatEnum;
  is_active?: boolean;
  priority_in_screen?: number;
  list_type?: ListTypeEnum;
  percentage_width?: number;
  percentage_height?: number;
  media_type?: string;
  media_categories_list?: string[];
  latest_first?: boolean;
  slug?: string;
  relative_url_link?: string;
}

export interface MediaShowcaseFilters {
  skip?: number;
  limit?: number;
  q?: string;
  list_type?: ListTypeEnum;
  is_active?: boolean;
  thumbnail_format?: ThumbnailFormatEnum;
}

// MediaShowcase JSON cache types
export interface MediaShowcaseItemJSON {
  id: string;
  title: string;
  media_type: string;
  friendly_url?: string;
  slug?: string;
  media_categories_list?: string[];
  descriptive_summary_text?: string;
  is_featured: boolean;
  thumbnail_url?: string;
  program_id?: string;
  season_id?: string;
  episode_number?: number;
  display_order: number;
}

export interface MediaShowcaseJSON {
  id: string;
  title: string;
  description?: string;
  thumbnail_format: ThumbnailFormatEnum;
  width_percentage: number;
  height_percentage: number;
  is_active: boolean;
  priority_in_screen: number;
  list_type: ListTypeEnum;
  relative_url_link?: string;
  last_updated?: string;
  items: MediaShowcaseItemJSON[];
}

export interface MediaShowcaseWithItems extends MediaShowcase {
  items: MediaShowcaseItemJSON[];
}

// Media showcase item operation responses
export interface MediaShowcaseItemOperationResponse {
  message: string;
  showcase_id: string;
  items_affected: number;
  new_item_count: number;
}

// Media showcase item management request types
export interface MediaShowcaseItemsUpdate {
  media_description_ids: string[];
}

export interface MediaShowcaseAddItems {
  media_description_ids: string[];
  position?: number;
}

export interface MediaShowcaseRemoveItems {
  media_description_ids: string[];
}

export interface MediaShowcaseReorderItem {
  media_description_id: string;
  new_priority: number;
}

// Media showcase JSON response
export interface MediaShowcaseJSONResponse {
  showcase: MediaShowcaseJSON;
}

// Media showcase bulk refresh response
export interface MediaShowcaseBulkRefreshResponse {
  message: string;
  success_count: number;
  error_count: number;
  total_count: number;
  errors: string[];
}

export interface PaginatedMediaShowcasesResponse extends PaginatedResponse<MediaShowcase> {}

// Enhanced user subscription management
export interface UserSubscriptionPlanUpdate {
  subscription_plan_ids: string[];
}

// Enhanced audio language management for video files
export interface AudioLanguageUpdate {
  language_ids: string[];
}

// API 1.13 Updated PublicPerson create/update types
export interface PublicPersonCreateApi13 {
  stage_name_roman: string;
  stage_name_local?: string;
  real_name_roman?: string;
  real_name_local?: string;
  biography_text?: string;
  birth_date?: string;
  country_of_origin_id?: string;
  profile_image_id?: string;
}

export interface PublicPersonUpdateApi13 {
  stage_name_roman?: string;
  stage_name_local?: string;
  real_name_roman?: string;
  real_name_local?: string;
  biography_text?: string;
  birth_date?: string;
  country_of_origin_id?: string;
  profile_image_id?: string;
}

// Updated Picture interface to match API 1.13
export interface PictureApi13 {
  id: string;
  image_url: string;
  file_name?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  file_size_bytes?: number;
  content_type?: string;
}

export interface PictureCreateApi13 {
  image_url: string;
  file_name?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  file_size_bytes?: number;
  content_type?: string;
}

export interface PictureUpdateApi13 {
  image_url?: string;
  file_name?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  file_size_bytes?: number;
  content_type?: string;
}

// Web Component Types - moved from individual components to shared types
export interface MediaShowcaseItem {
  id: string;
  title: string;
  media_type: string;
  friendly_url?: string;
  slug?: string;
  media_categories_list?: string[];
  descriptive_summary_text?: string;
  is_featured: boolean;
  thumbnail_url?: string;
  program_id?: string;
  season_id?: string;
  episode_number?: number;
  display_order: number;
}

export interface ContentListItem {
  content_id: string;
  content_type: string;
  title: string;
  thumbnail_url?: string;
  description?: string;
  short_summary?: string;
  image_alt_text: string;
  display_order: number;
}

// Screen Data types for consolidated data fetching
export interface ProgramScreenData {
  program: Program;
  currentSeason: Season;
  programImageUrl: string | null;
  synopsis: string | null;
  description: string | null;
  genres: string[];
  audioLanguages: (Language | null)[];
  subtitleLanguages: (Language | null)[];
  releaseDate: number | null;
  originCountries: (Country | null)[];
  actors: (PublicPerson | null)[];
  directors: (PublicPerson | null)[];
  producers: (PublicPerson | null)[];
  allSeasons: Array<Season & {
    thumbnailUrl: string | null;
    episodeCount: number;
  }>;
}

// Verify/Diagnosis response types
export interface VerifyResponse {
  id: string;
  diagnostics: string;
  is_ready: boolean;
  errors: string[];
}

export interface VideoFileVerifyResponse extends VerifyResponse {}
export interface MediaDescriptionVerifyResponse extends VerifyResponse {}
