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
  VideoFileReport,
  MediaShowcase,
  MediaShowcaseCreate,
  MediaShowcaseUpdate,
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
  mapOne: (item: any): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
    // Convert relationship arrays to ID arrays for React Admin inputs
    actor_ids: item.actors ? item.actors.map((a: any) => a.id) : [],
    director_ids: item.directors ? item.directors.map((d: any) => d.id) : [],
    producer_ids: item.producers ? item.producers.map((p: any) => p.id) : [],
    author_ids: item.authors ? item.authors.map((a: any) => a.id) : [],
    origin_country_ids: item.origin_countries ? item.origin_countries.map((c: any) => c.id) : [],
    available_country_ids: item.available_countries ? item.available_countries.map((c: any) => c.id) : [],
    original_language_ids: item.original_languages ? item.original_languages.map((l: any) => l.id) : [],
    available_subtitle_language_ids: item.available_subtitle_languages ? item.available_subtitle_languages.map((l: any) => l.id) : [],
    available_audio_language_ids: item.available_audio_languages ? item.available_audio_languages.map((l: any) => l.id) : [],
    audience_category_ids: item.audience_categories ? item.audience_categories.map((a: any) => a.id) : [],
    media_theme_ids: item.media_themes ? item.media_themes.map((t: any) => t.id) : [],
    theme_ids: item.themes ? item.themes.map((t: any) => t.id) : [], // Keep legacy support
    eligible_plan_ids: item.eligible_plans ? item.eligible_plans.map((p: any) => p.id) : [],
    additional_image_ids: item.additional_images ? item.additional_images.map((i: any) => i.id) : [],
    trailer_ids: item.trailers ? item.trailers.map((v: any) => v.id) : [],
    excerpt_ids: item.excerpts ? item.excerpts.map((v: any) => v.id) : [],
    // Convert single fields
    media_categories: item.media_categories || [],
    seo_keywords_text_list: item.seo_keywords_text_list || [],
    hashtags_text_list: item.hashtags_text_list || [],
    human_keywords_text_list: item.human_keywords_text_list || [], // Deprecated
    tag_text_list: item.tag_text_list || [], // New v1.9 field
    slug: item.slug || '', // New v1.9 field
    additional_images_id_list: item.additional_images_id_list || [],
    image_mobile_home: item.image_mobile_home || '',
    image_desktop_home: item.image_desktop_home || '',
  }),

  mapList: (items: any[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
      // Show key fields in list view
      title: item.episode_title,
      type: item.media_type,
      status: item.content_status || 'draft',
      featured: item.is_featured || false,
    })),

  mapToCreate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, title, type, status, featured, ...rest } = data;
    return {
      file_number: data.file_number || 0,
      episode_title: data.episode_title || data.title || '',
      media_type: data.media_type || data.type || 'video',
      content_status: data.content_status || data.status || 'draft',
      is_featured: data.is_featured || data.featured || false,
      // Map relationship ID arrays
      actor_ids: data.actor_ids || [],
      director_ids: data.director_ids || [],
      producer_ids: data.producer_ids || [],
      author_ids: data.author_ids || [],
      origin_country_ids: data.origin_country_ids || [],
      available_country_ids: data.available_country_ids || [],
      original_language_ids: data.original_language_ids || [],
      available_subtitle_language_ids: data.available_subtitle_language_ids || [],
      available_audio_language_ids: data.available_audio_language_ids || [],
      audience_category_ids: data.audience_category_ids || [],
      media_theme_ids: data.media_theme_ids || [],
      theme_ids: data.theme_ids || [], // Legacy support
      eligible_plan_ids: data.eligible_plan_ids || [],
      additional_image_ids: data.additional_image_ids || [],
      trailer_ids: data.trailer_ids || [],
      excerpt_ids: data.excerpt_ids || [],
      // New v1.9 fields
      tag_text_list: data.tag_text_list || [],
      slug: data.slug || '',
      // New v1.6 image fields
      image_mobile_home: data.image_mobile_home || '',
      image_desktop_home: data.image_desktop_home || '',
      // Revenue fields
      translation_share: data.translation_share,
      sacem_share: data.sacem_share,
      other_share: data.other_share,
      revenue_share: data.revenue_share,
      paid_token_cost: data.paid_token_cost,
      ...rest
    };
  },

  mapToUpdate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, title, type, status, featured, ...rest } = data;
    return {
      episode_title: data.episode_title || data.title,
      media_type: data.media_type || data.type,
      content_status: data.content_status || data.status,
      is_featured: data.is_featured !== undefined ? data.is_featured : data.featured,
      // Map relationship ID arrays
      actor_ids: data.actor_ids || [],
      director_ids: data.director_ids || [],
      producer_ids: data.producer_ids || [],
      author_ids: data.author_ids || [],
      origin_country_ids: data.origin_country_ids || [],
      available_country_ids: data.available_country_ids || [],
      original_language_ids: data.original_language_ids || [],
      available_subtitle_language_ids: data.available_subtitle_language_ids || [],
      available_audio_language_ids: data.available_audio_language_ids || [],
      audience_category_ids: data.audience_category_ids || [],
      media_theme_ids: data.media_theme_ids || [],
      theme_ids: data.theme_ids || [], // Legacy support
      eligible_plan_ids: data.eligible_plan_ids || [],
      additional_image_ids: data.additional_image_ids || [],
      trailer_ids: data.trailer_ids || [],
      excerpt_ids: data.excerpt_ids || [],
      // New v1.9 fields
      tag_text_list: data.tag_text_list || [],
      slug: data.slug || '',
      // New v1.6 image fields
      image_mobile_home: data.image_mobile_home || '',
      image_desktop_home: data.image_desktop_home || '',
      // Revenue fields
      translation_share: data.translation_share,
      sacem_share: data.sacem_share,
      other_share: data.other_share,
      revenue_share: data.revenue_share,
      paid_token_cost: data.paid_token_cost,
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


// Simple audience categories mapper
const audienceCategories = {
  mapOne: (item: any): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
  }),

  mapList: (items: any[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
    })),

  mapToCreate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, ...rest } = data;
    return rest;
  },

  mapToUpdate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, ...rest } = data;
    return rest;
  },
};

// Simple subscription plans mapper
const subscriptionPlans = {
  mapOne: (item: any): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
  }),

  mapList: (items: any[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
    })),

  mapToCreate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, ...rest } = data;
    return rest;
  },

  mapToUpdate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, ...rest } = data;
    return rest;
  },
};

// Video file reports mapper - read-only resource
const videoFileReports = {
  mapOne: (item: VideoFileReport): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.timestamp,
  }),

  mapList: (items: VideoFileReport[]): ReactAdminRecord[] => 
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.timestamp,
    })),
};

// Media themes mapper
const mediaThemes = {
  mapOne: (item: any): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
  }),

  mapList: (items: any[]): ReactAdminRecord[] =>
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
    })),

  mapToCreate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, ...rest } = data;
    return rest;
  },

  mapToUpdate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, ...rest } = data;
    return rest;
  },
};

// Media showcases mapper
const mediaShowcases = {
  mapOne: (item: any): ReactAdminRecord => ({
    ...item,
    id: item.id,
    created_at: item.creation_date_utc,
    updated_at: item.last_updated_utc,
    // Transform relationship arrays to ID arrays for React Admin inputs
    media_description_ids: item.media_descriptions ? item.media_descriptions.map((m: any) => m.id) : [],
    media_theme_ids: item.media_themes ? item.media_themes.map((t: any) => t.id) : [],
    // PRESERVE the original arrays for display components
    media_descriptions: item.media_descriptions || [],
    media_themes: item.media_themes || [],
    // Ensure all boolean fields have proper defaults
    is_active: item.is_active !== undefined ? item.is_active : true,
    latest_first: item.latest_first !== undefined ? item.latest_first : true,
    // Ensure numeric fields have defaults
    priority_in_screen: item.priority_in_screen !== undefined ? item.priority_in_screen : 0,
    percentage_width: item.percentage_width !== undefined ? item.percentage_width : 100,
    percentage_height: item.percentage_height !== undefined ? item.percentage_height : 100,
  }),

  mapList: (items: any[]): ReactAdminRecord[] =>
    (items || []).map((item) => ({
      ...item,
      id: item.id,
      created_at: item.creation_date_utc,
      updated_at: item.last_updated_utc,
      // PRESERVE the original arrays for display consistency
      media_descriptions: item.media_descriptions || [],
      media_themes: item.media_themes || [],
      // Show key fields in list view
      media_items_count: item.media_descriptions ? item.media_descriptions.length : 0,
      // Ensure booleans are properly displayed
      is_active: item.is_active !== undefined ? item.is_active : true,
    })),

  mapToCreate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, updated_at, last_updated_utc, media_items_count, ...rest } = data;
    return {
      title: data.title || '',
      description: data.description || null,
      thumbnail_format: data.thumbnail_format,
      is_active: data.is_active !== false,
      priority_in_screen: data.priority_in_screen !== undefined ? data.priority_in_screen : 0,
      list_type: data.list_type,
      percentage_width: data.percentage_width !== undefined ? data.percentage_width : 100,
      percentage_height: data.percentage_height !== undefined ? data.percentage_height : 100,
      media_type: data.media_type || null,
      media_categories_list: data.media_categories_list || [],
      latest_first: data.latest_first !== false,
      slug: data.slug || null,
      // Map relationship ID arrays
      media_description_ids: data.media_description_ids || [],
      media_theme_ids: data.media_theme_ids || [],
    };
  },

  mapToUpdate: (data: ReactAdminRecord): any => {
    const { id, created_at, creation_date_utc, updated_at, last_updated_utc, media_items_count, ...rest } = data;
    return {
      // Core fields
      title: data.title,
      description: data.description,
      thumbnail_format: data.thumbnail_format,
      is_active: data.is_active,
      priority_in_screen: data.priority_in_screen,
      list_type: data.list_type,
      percentage_width: data.percentage_width,
      percentage_height: data.percentage_height,
      media_type: data.media_type,
      media_categories_list: data.media_categories_list,
      latest_first: data.latest_first,
      slug: data.slug,
      // Map relationship ID arrays
      media_description_ids: data.media_description_ids || [],
      media_theme_ids: data.media_theme_ids || [],
    };
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
  videoFileReports,
  mediaThemes,
  audienceCategories,
  subscriptionPlans,
  mediaShowcases,
};