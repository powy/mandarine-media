// Media type options
export const MEDIA_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'webtoon', label: 'Webtoon' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'teaser', label: 'Teaser' },
  { value: 'excerpt', label: 'Excerpt' },
] as const;

// Content status options
export const CONTENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
  { value: 'scheduled', label: 'Scheduled' },
] as const;

// Content rating options
export const CONTENT_RATINGS = [
  { value: 'G', label: 'G - General Audiences' },
  { value: 'PG', label: 'PG - Parental Guidance' },
  { value: 'PG-13', label: 'PG-13 - Parents Strongly Cautioned' },
  { value: 'R', label: 'R - Restricted' },
  { value: '18+', label: '18+ - Adults Only' },
] as const;

// Language options (common ones)
export const LANGUAGES = [
  { value: 'ko', label: 'Korean' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
] as const;

// Genre options
export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Science Fiction', 'Thriller', 'War', 'Western', 'K-Drama',
  'K-Pop', 'Variety Show', 'Reality TV', 'Talk Show', 'News'
] as const;

// Profession options for Public Persons
export const PROFESSIONS = [
  'Actor', 'Actress', 'Director', 'Producer', 'Writer', 'Singer',
  'Dancer', 'Model', 'Host', 'Comedian', 'Voice Actor', 'Composer',
  'Choreographer', 'Cinematographer', 'Editor'
] as const;