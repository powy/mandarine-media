// Export shared hooks here
export * from './useAuth';
export * from './useVideoUpload';
export * from './useVideoPlayback';
export * from './useDescriptionReports';
export * from './useBulkDescriptions';
export * from './useRegionAccess';
export * from './useTrailersAndExcerpts';
export * from './useMediaShowcases';
export * from './useProgramScreen';
export * from './useProgramJSON';
export * from './useSeasonJSON';
export { useMediaShowcase as useMediaShowcaseLogic } from './useMediaShowcase';
export * from './usePicture';
export * from './useDebounce';

// Legacy exports - deprecated (maintained for backward compatibility with alpha app)
/** @deprecated Use MediaShowcase-related hooks instead. ContentList has been replaced by MediaShowcase. */
export * from './useContentList';