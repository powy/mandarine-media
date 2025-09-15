export * from './client';
export * from './auth';
export * from './media';
export * from './media-uploads';
export * from './users';
export * from './persons';
export * from './video-file-reports';
export * from './programs';
export * from './seasons';
export * from './languages';
export * from './countries';
export * from './pictures';
export * from './content-lists';
export * from './screen-contents'; // Note: now includes screen-descriptions exports
export * from './audience-categories';
export * from './subscription-plans';
export * from './media-themes';

// API 1.13 New exports
export * from './media-showcases';
export * from './description-reports';

// Legacy exports - deprecated
/** @deprecated territories.ts is deprecated, not in API 1.13 */
export * from './territories';
/** @deprecated category-lists.ts is deprecated, replaced by media-showcases */
export * from './category-lists';

// Core function exports
export { getMediaDescription, getMediaDescriptions, getVideoFilesByMediaDescription, getVideoScreenData, getSeasonScreenData, getProgramScreenData, getProgramScreenDataByProgramId } from './media';
export { getSeason, getSeasonsByProgram } from './seasons';
export { getProgram } from './programs';

// API 1.13 New function exports
export {
  getMediaShowcases,
  getMediaShowcase,
  createMediaShowcase,
  updateMediaShowcase,
  deleteMediaShowcase,
  getMediaShowcaseJSON,
  refreshMediaShowcaseJSON,
  getMediaShowcaseWithItems,
  replaceMediaShowcaseItems,
  addMediaShowcaseItems,
  removeMediaShowcaseItems,
  reorderMediaShowcaseItem,
  searchMediaShowcases,
  getMediaShowcaseBySlug,
  refreshAllMediaShowcaseJSONs
} from './media-showcases';
export { getDescriptionReports, getDescriptionReport, getDescriptionReportsByBatch } from './description-reports';