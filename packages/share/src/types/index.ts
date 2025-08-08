// API Types based on backend models
export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaDescription {
  id: string;
  creation_date_utc: string;
  file_number: number;
  episode_title: string;
  media_type: 'video' | 'webtoon' | 'trailer' | 'teaser' | 'excerpt';
  file_name?: string;
  expected_filename?: string;
  program_id?: string;
  season_id?: string;
  episode_number?: number;
  media_categories_id_list?: string[];
  themes_and_genres_id_list?: string[];
  descriptive_summary_text?: string;
  synopsis_text?: string;
  contract_start_date_utc?: string;
  contract_end_date_utc?: string;
  production_year?: number;
  original_broadcast_date_utc?: string;
  duration_seconds?: number;
  audience_category_id?: string;
  subscription_plan_id_list?: string[];
  public_person_id_list?: string[];
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
  view_count?: number;
  like_count?: number;
  share_count?: number;
  last_updated_utc?: string;
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
  productor_id_list?: string[];
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
  translation_share?: number;
  sacem_share?: number;
  other_share?: number;
  revenue_share?: number;
  paid_token_cost?: number;
}

export interface VideoFile {
  id: string;
  media_description_id?: string;
  file_name?: string;
  file_path?: string;
  file_url?: string;
  file_size_bytes?: number;
  resolution?: string;
  bitrate_kbps?: number;
  format?: string;
  file_format?: string;
  duration_seconds?: number;
  encoding_status: string;
  encoding_logs?: string | null;
  // Dual upload support fields
  upload_method: 'new_upload' | 'existing_url';
  upload_status: 'metadata_only' | 'file_uploading' | 'upload_completed' | 'upload_failed';
  upload_timestamp?: string;
  external_url?: string;
  // Technical fields
  video_codec?: string;
  audio_codec?: string;
  resolution_width?: number;
  resolution_height?: number;
  frame_rate?: number;
  aspect_ratio?: string;
  audio_sample_rate?: number;
  audio_channels?: number;
  // Mux integration
  mux_asset_id?: string;
  mux_playback_id?: string;
  // Timestamps
  creation_date_utc: string;
  encodage_date_utc?: string;
  created_at?: string;
  updated_at?: string;
  // v1.4 new fields
  subtitle_languages_id_list?: string[];
  audio_languages_id_list?: string[];
  resolutions_id_list?: string[];
  accessibilities_id_list?: string[];
}

export interface PublicPerson {
  id: string;
  creation_date_utc: string;
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

// v1.4 new models
export interface Program {
  id: string;
  creation_date_utc: string;
  program_name: string;
  general_media_description?: string;
}

export interface Season {
  id: string;
  creation_date_utc: string;
  program_id: string;
  season_number: number;
}

export interface Language {
  id: string;
  creation_date_utc: string;
  name: string;
  sigle: string;
}

export interface Country {
  id: string;
  creation_date_utc: string;
  name: string;
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
  photo_url: string;
  file_name?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  alt_text?: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
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
export interface PaginationInfo {
  skip: number;
  limit: number;
  total: number;
  page: number;
  pages: number;
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

// Specific response types
export interface PaginatedCountriesResponse extends PaginatedResponse<Country> {}
export interface PaginatedLanguagesResponse extends PaginatedResponse<Language> {}
export interface PaginatedTerritoriesResponse extends PaginatedResponse<Territory> {}
export interface PaginatedPicturesResponse extends PaginatedResponse<Picture> {}
export interface PaginatedProgramsResponse extends PaginatedResponse<Program> {}
export interface PaginatedSeasonsResponse extends PaginatedResponse<Season> {}
export interface PaginatedPersonsResponse extends PaginatedResponse<PublicPerson> {}
export interface PaginatedUsersResponse extends PaginatedResponse<User> {}

export interface MediaDescriptionListResponse extends PaginatedResponse<MediaDescription> {}
export interface VideoFileListResponse extends PaginatedResponse<VideoFile> {}

// Filter types
export interface MediaFilters {
  skip?: number;
  limit?: number;
  media_type?: string;
  category_id?: string;
  status?: string;
  is_featured?: boolean;
  is_premium?: boolean;
}

export interface VideoFileFilters {
  skip?: number;
  limit?: number;
  media_description_id?: string;
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
  media_type: 'video' | 'webtoon' | 'trailer' | 'teaser' | 'excerpt';
  file_name?: string;
  expected_filename?: string;
  program_id?: string;
  season_id?: string;
  episode_number?: number;
  media_categories_id_list?: string[];
  themes_and_genres_id_list?: string[];
  descriptive_summary_text?: string;
  synopsis_text?: string;
  contract_start_date_utc?: string;
  contract_end_date_utc?: string;
  production_year?: number;
  original_broadcast_date_utc?: string;
  duration_seconds?: number;
  audience_category_id?: string;
  subscription_plan_id_list?: string[];
  public_person_id_list?: string[];
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
  view_count?: number;
  like_count?: number;
  share_count?: number;
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
  productor_id_list?: string[];
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
  translation_share?: number;
  sacem_share?: number;
  other_share?: number;
  revenue_share?: number;
  paid_token_cost?: number;
}

// v1.4 new create/update interfaces
export interface ProgramCreate {
  program_name: string;
  general_media_description?: string;
}

export interface ProgramUpdate {
  program_name?: string;
  general_media_description?: string;
}

export interface SeasonCreate {
  program_id: string;
  season_number: number;
}

export interface SeasonUpdate {
  season_number?: number;
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
  photo_url: string;
  file_name?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  alt_text?: string;
}

export interface PictureUpdate {
  photo_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  alt_text?: string;
}

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
  upload_method?: string;
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

// v1.6 New Types
export type ThumbnailFormatEnum = 'small_square' | 'medium_portrait' | 'large_landscape' | 'vertical_mobile';

export interface ContentList {
  id: string;
  creation_date_utc: string;
  last_updated_utc: string;
  title: string;
  thumbnail_format: ThumbnailFormatEnum;
  is_active: boolean;
  display_order: number;
  description?: string;
  content_items?: string[];
  content_types?: string[];
  json_content?: string;
  json_last_updated?: string;
}

export interface ContentListCreate {
  title: string;
  thumbnail_format: ThumbnailFormatEnum;
  is_active: boolean;
  display_order: number;
  description?: string;
  content_items?: string[];
  content_types?: string[];
}

export interface ContentListUpdate {
  title?: string;
  thumbnail_format?: ThumbnailFormatEnum;
  is_active?: boolean;
  display_order?: number;
  description?: string;
  content_items?: string[];
  content_types?: string[];
}

export interface ContentListJSON {
  id: string;
  title: string;
  thumbnail_format: ThumbnailFormatEnum;
  description?: string;
  last_updated: string;
  items: ContentListItemJSON[];
}

export interface ContentListItemJSON {
  content_id: string;
  content_type: 'program' | 'season' | 'media_description';
  title: string;
  thumbnail_url?: string;
  display_order: number;
}

export interface ScreenContent {
  id: string;
  creation_date_utc: string;
  last_updated_utc: string;
  title: string;
  is_active: boolean;
  display_order: number;
  description?: string;
  content_lists?: string[];
  screen_type?: string;
  json_content?: string;
  json_last_updated?: string;
}

export interface ScreenContentCreate {
  title: string;
  is_active: boolean;
  display_order: number;
  description?: string;
  content_lists?: string[];
  screen_type?: string;
}

export interface ScreenContentUpdate {
  title?: string;
  is_active?: boolean;
  display_order?: number;
  description?: string;
  content_lists?: string[];
  screen_type?: string;
}

export interface ScreenContentJSON {
  id: string;
  title: string;
  description?: string;
  screen_type?: string;
  last_updated: string;
  content_lists: ContentListJSON[];
}

export interface ContentListFilters {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  thumbnail_format?: ThumbnailFormatEnum;
}

export interface ScreenContentFilters {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  screen_type?: string;
}

export interface ContentListListResponse extends PaginatedResponse<ContentList> {}
export interface ScreenContentListResponse extends PaginatedResponse<ScreenContent> {}

export interface ReorderContentRequest {
  content_items: string[];
  content_types: string[];
}

export interface ReorderListsRequest {
  content_lists: string[];
}