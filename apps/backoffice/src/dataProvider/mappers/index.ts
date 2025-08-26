import {
  Country,
  CountryCreate,
  CountryUpdate,
  MediaDescription,
  MediaDescriptionCreate,
  Language,
  LanguageCreate,
  LanguageUpdate,
  Picture,
  PictureCreate,
  PictureUpdate,
  Program,
  ProgramCreate,
  ProgramUpdate,
  Season,
  SeasonCreate,
  SeasonUpdate,
  PublicPerson,
  PublicPersonCreate,
  PublicPersonUpdate,
  User,
  ContentList,
  ContentListCreate,
  ContentListUpdate,
  ScreenContent,
  ScreenContentCreate,
  ScreenContentUpdate,
  VideoFile,
} from 'share';

// React Admin expects 'id' field and ISO date strings work well with date inputs
interface ReactAdminRecord {
  id: string | number;
  [key: string]: any;
}

// Generic mapper functions
const createBaseMapper = <T extends { id: string; creation_date_utc: string }, C, U>() => ({
  mapOne: (item: T): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
  }),

  mapList: (items: T[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
    })),

  mapToCreate: (data: ReactAdminRecord): C => {
    const { id, created_at, creation_date_utc, ...rest } = data;
    return rest as C;
  },

  mapToUpdate: (data: ReactAdminRecord): U => {
    const { id, created_at, creation_date_utc, ...rest } = data;
    return rest as U;
  },
});

// Specific mappers for each resource
const countries = createBaseMapper<Country, CountryCreate, CountryUpdate>();

const languages = createBaseMapper<Language, LanguageCreate, LanguageUpdate>();


const pictures = createBaseMapper<Picture, PictureCreate, PictureUpdate>();

const programs = createBaseMapper<Program, ProgramCreate, ProgramUpdate>();

const seasons = {
  ...createBaseMapper<Season, SeasonCreate, SeasonUpdate>(),
  mapOne: (item: Season): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
  }),

  mapList: (items: Season[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
    })),
};

const publicPersons = {
  mapOne: (item: PublicPerson): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
    full_name: `${item.first_name_roman || ''} ${item.last_name_roman || ''}`.trim() || item.stage_name_roman,
    profession_list: Array.isArray(item.profession_list) 
      ? item.profession_list.join(', ')
      : (item.profession_list || ''),
    profession_list_array: item.profession_list || [], // Keep array version for display
  }),

  mapList: (items: PublicPerson[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
      full_name: `${item.first_name_roman || ''} ${item.last_name_roman || ''}`.trim() || item.stage_name_roman,
      profession_list: Array.isArray(item.profession_list) 
        ? item.profession_list.join(', ')
        : (item.profession_list || ''),
      profession_list_array: item.profession_list || [], // Keep array version for display
    })),

  mapToCreate: (data: ReactAdminRecord): PublicPersonCreate => {
    const { id, created_at, creation_date_utc, full_name, profession_list, ...rest } = data;
    return {
      stage_name_roman: data.stage_name_roman || data.full_name || 'Unknown',
      profession_list: typeof profession_list === 'string' 
        ? profession_list.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : profession_list,
      ...rest
    } as PublicPersonCreate;
  },

  mapToUpdate: (data: ReactAdminRecord): PublicPersonUpdate => {
    const { id, created_at, creation_date_utc, full_name, profession_list, ...rest } = data;
    return {
      profession_list: typeof profession_list === 'string' 
        ? profession_list.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : profession_list,
      ...rest
    } as PublicPersonUpdate;
  },
};

const users = {
  mapOne: (item: User): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.created_at,
  }),

  mapList: (items: User[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.created_at,
    })),

  mapToCreate: (data: ReactAdminRecord) => {
    const { id, created_at, updated_at, ...rest } = data;
    return {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      is_active: data.is_active !== false,
      is_admin: data.is_admin === true,
    };
  },

  mapToUpdate: (data: ReactAdminRecord) => {
    const { id, created_at, updated_at, ...rest } = data;
    return rest;
  },
};

const mediaDescriptions = {
  mapOne: (item: MediaDescription): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
    // Convert array fields for React Admin
    media_categories_id_list: item.media_categories_id_list || [],
    themes_and_genres_id_list: item.themes_and_genres_id_list || [],
    subscription_plan_id_list: item.subscription_plan_id_list || [],
    public_person_id_list: item.public_person_id_list || [],
    subtitle_languages_available: item.subtitle_languages_available || [],
    audio_languages_available: item.audio_languages_available || [],
    seo_keywords: item.seo_keywords || [],
    social_media_hashtags: item.social_media_hashtags || [],
    distribution_territories: item.distribution_territories || [],
    // v1.4 fields
    actors_id_list: item.actors_id_list || [],
    directors_id_list: item.directors_id_list || [],
    productor_id_list: item.productor_id_list || [],
    authors_id_list: item.authors_id_list || [],
    origin_country_id_list: item.origin_country_id_list || [],
    original_languages_id: item.original_languages_id || [],
    available_countries_list: item.available_countries_list || [],
    eligible_plans: item.eligible_plans || [],
    audience_categories_id_list: item.audience_categories_id_list || [],
    additional_images_id_list: item.additional_images_id_list || [],
  }),

  mapList: (items: MediaDescription[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
      // Show key fields in list view
      title: item.episode_title,
      type: item.media_type,
      status: item.content_status || 'draft',
      featured: item.is_featured || false,
      premium: item.is_premium_content || false,
    })),

  mapToCreate: (data: ReactAdminRecord): MediaDescriptionCreate => {
    const { id, created_at, creation_date_utc, title, type, status, featured, premium, ...rest } = data;
    return {
      file_number: data.file_number || 0,
      episode_title: data.episode_title || data.title || '',
      media_type: data.media_type || data.type || 'video',
      content_status: data.content_status || data.status,
      is_featured: data.is_featured || data.featured,
      is_premium_content: data.is_premium_content || data.premium,
      ...rest
    } as MediaDescriptionCreate;
  },

  mapToUpdate: (data: ReactAdminRecord): Partial<MediaDescription> => {
    const { id, created_at, creation_date_utc, title, type, status, featured, premium, ...rest } = data;
    return {
      episode_title: data.episode_title || data.title,
      media_type: data.media_type || data.type,
      content_status: data.content_status || data.status,
      is_featured: data.is_featured !== undefined ? data.is_featured : data.featured,
      is_premium_content: data.is_premium_content !== undefined ? data.is_premium_content : data.premium,
      ...rest
    };
  },
};


const contentLists = {
  mapOne: (item: ContentList): ReactAdminRecord => {
    // Transform API format to UI format for editing
    const content_data = (item.content_items || []).map((content_id, index) => ({
      content_id,
      content_type: (item.content_types || [])[index] || 'program'
    }));
    
    return {
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
      updated_at: item.last_updated_utc,
      content_items: item.content_items || [],
      content_types: item.content_types || [],
      content_data, // For the UI forms
    };
  },

  mapList: (items: ContentList[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
      updated_at: item.last_updated_utc,
      content_count: item.content_items?.length || 0,
    })),

  mapToCreate: (data: ReactAdminRecord): ContentListCreate => {
    const { id, created_at, creation_date_utc, updated_at, last_updated_utc, content_count, content_data, ...rest } = data;
    
    // Transform UI format to API format
    let content_items = data.content_items || [];
    let content_types = data.content_types || [];
    
    if (content_data && Array.isArray(content_data)) {
      content_items = content_data.map(item => item.content_id);
      content_types = content_data.map(item => item.content_type);
    }
    
    return {
      title: data.title || '',
      thumbnail_format: data.thumbnail_format || '1080x1080',
      is_active: data.is_active !== false,
      display_order: data.display_order || 0,
      content_items,
      content_types,
      ...rest
    } as ContentListCreate;
  },

  mapToUpdate: (data: ReactAdminRecord): ContentListUpdate => {
    const { id, created_at, creation_date_utc, updated_at, last_updated_utc, content_count, content_data, ...rest } = data;
    
    // Transform UI format to API format
    let content_items = data.content_items || [];
    let content_types = data.content_types || [];
    
    if (content_data && Array.isArray(content_data)) {
      content_items = content_data.map(item => item.content_id);
      content_types = content_data.map(item => item.content_type);
    }
    
    return {
      content_items,
      content_types,
      ...rest
    } as ContentListUpdate;
  },
};

const screenContents = {
  mapOne: (item: ScreenContent): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
    updated_at: item.last_updated_utc,
    content_lists: item.content_lists || [],
  }),

  mapList: (items: ScreenContent[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
      updated_at: item.last_updated_utc,
      list_count: item.content_lists?.length || 0,
    })),

  mapToCreate: (data: ReactAdminRecord): ScreenContentCreate => {
    const { id, created_at, creation_date_utc, updated_at, last_updated_utc, list_count, ...rest } = data;
    return {
      title: data.title || '',
      is_active: data.is_active !== false,
      display_order: data.display_order || 0,
      content_lists: data.content_lists || [],
      ...rest
    } as ScreenContentCreate;
  },

  mapToUpdate: (data: ReactAdminRecord): ScreenContentUpdate => {
    const { id, created_at, creation_date_utc, updated_at, last_updated_utc, list_count, ...rest } = data;
    return rest as ScreenContentUpdate;
  },
};

const videoFiles = {
  mapOne: (item: VideoFile): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
    filename: item.file_name, // Map file_name to filename for UI consistency
  }),

  mapList: (items: VideoFile[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
      filename: item.file_name, // Map file_name to filename for UI consistency
    })),

  mapToCreate: (data: ReactAdminRecord): Partial<VideoFile> => {
    const { id, created_at, updated_at, last_updated_utc, filename, ...rest } = data;
    return {
      file_name: data.filename || '',
      external_url: data.external_url || null,
      media_description_id: data.media_description_id || null,
      upload_status: data.upload_status || 'upload_completed',
      encoding_status: 'completed', // Default encoding status
      ...rest
    } as Partial<VideoFile>;
  },

  mapToUpdate: (data: ReactAdminRecord): Partial<VideoFile> => {
    const { id, created_at, updated_at, last_updated_utc, filename, ...rest } = data;
    return {
      file_name: data.filename,
      external_url: data.external_url,
      media_description_id: data.media_description_id,
      upload_status: data.upload_status,
      encoding_status: data.encoding_status,
      ...rest
    } as Partial<VideoFile>;
  },
};


export const resourceMappers = {
  countries,
  languages,
  pictures,
  programs,
  seasons,
  publicPersons,
  users,
  mediaDescriptions,
  contentLists,
  screenContents,
  videoFiles,
};