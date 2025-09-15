import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api/client';
import { mediaApi } from '../api/media';
import type {
  MediaDescription,
  MediaDescriptionCreate,
  MediaDescriptionUpdate,
  PublicPersonSimple,
  MediaThemeSimple,
  PictureSimple,
} from '../types';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = apiClient as any;

describe('Relationship System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActors: PublicPersonSimple[] = [
    { id: 'person-1', full_name: 'Yoo Jae-suk', role_type: 'main_actor' },
    { id: 'person-2', full_name: 'Kim Jong-kook', role_type: 'supporting_actor' },
    { id: 'person-3', full_name: 'Song Ji-hyo', role_type: 'main_actor' },
  ];

  const mockDirectors: PublicPersonSimple[] = [
    { id: 'person-4', full_name: 'Jo Hyo-jin', role_type: 'main_director' },
    { id: 'person-5', full_name: 'Assistant Director', role_type: 'assistant_director' },
  ];

  const mockProducers: PublicPersonSimple[] = [
    { id: 'person-6', full_name: 'SBS Production Team', role_type: 'executive_producer' },
    { id: 'person-7', full_name: 'Line Producer', role_type: 'line_producer' },
  ];

  const mockMediaThemes: MediaThemeSimple[] = [
    { id: 'theme-1', theme_name: 'variety' },
    { id: 'theme-2', theme_name: 'comedy' },
    { id: 'theme-3', theme_name: 'entertainment' },
  ];

  const mockAdditionalImages: PictureSimple[] = [
    { id: 'image-1', file_name: 'episode_poster_main.jpg' },
    { id: 'image-2', file_name: 'episode_poster_alt.jpg' },
    { id: 'image-3', file_name: 'behind_scenes_01.jpg' },
  ];

  const mockMediaWithRelationships: MediaDescription = {
    id: 'media-relationships-test',
    creation_date_utc: '2024-01-15T10:30:00Z',
    file_number: 2024001,
    episode_title: 'Running Man - Relationship Test Episode',
    media_type: 'video',
    slug: 'running_man_relationship_test',
    
    // NEW: Relationship objects
    actors: mockActors,
    directors: mockDirectors,
    producers: mockProducers,
    media_themes: mockMediaThemes,
    additional_images: mockAdditionalImages,
    
    // DEPRECATED: Backward compatibility fields
    /** @deprecated Use actors relationship object instead */
    actors_id_list: ['person-1', 'person-2', 'person-3'],
    /** @deprecated Use directors relationship object instead */
    directors_id_list: ['person-4', 'person-5'],
    /** @deprecated Use producers relationship object instead */
    producers_id_list: ['person-6', 'person-7'],
    /** @deprecated Use additional_images relationship object instead */
    additional_images_id_list: ['image-1', 'image-2', 'image-3'],
  };

  describe('MediaDescription Relationship Objects', () => {
    const mockActorsForTest: PublicPersonSimple[] = [
      { id: 'person-1', full_name: 'Yoo Jae-suk', role_type: 'main_actor' },
      { id: 'person-2', full_name: 'Kim Jong-kook', role_type: 'supporting_actor' },
      { id: 'person-3', full_name: 'Song Ji-hyo', role_type: 'main_actor' },
    ];

    it('should return complete relationship objects from API', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockMediaWithRelationships });

      const result = await mediaApi.getMediaDescription('media-relationships-test');

      expect(result.actors).toBeDefined();
      expect(result.actors).toHaveLength(3);
      expect(result.actors?.[0]).toEqual({
        id: 'person-1',
        full_name: 'Yoo Jae-suk',
        role_type: 'main_actor',
      });

      expect(result.directors).toBeDefined();
      expect(result.directors).toHaveLength(2);
      expect(result.directors?.[0].role_type).toBe('main_director');

      expect(result.producers).toBeDefined();
      expect(result.producers).toHaveLength(2);
      expect(result.producers?.[0].role_type).toBe('executive_producer');

      expect(result.media_themes).toBeDefined();
      expect(result.media_themes).toHaveLength(3);
      expect(result.media_themes?.[0].theme_name).toBe('variety');

      expect(result.additional_images).toBeDefined();
      expect(result.additional_images).toHaveLength(3);
      expect(result.additional_images?.[0].file_name).toBe('episode_poster_main.jpg');
    });

    it('should support different role types for actors', async () => {
      const actorsWithVariedRoles: PublicPersonSimple[] = [
        { id: 'person-1', full_name: 'Main Character', role_type: 'main_actor' },
        { id: 'person-2', full_name: 'Supporting Character', role_type: 'supporting_actor' },
        { id: 'person-3', full_name: 'Guest Star', role_type: 'guest_actor' },
        { id: 'person-4', full_name: 'Voice Actor', role_type: 'voice_actor' },
      ];

      const mediaWithVariedRoles: MediaDescription = {
        ...mockMediaWithRelationships,
        actors: actorsWithVariedRoles,
      };

      mockApiClient.get.mockResolvedValue({ data: mediaWithVariedRoles });

      const result = await mediaApi.getMediaDescription('media-test');

      expect(result.actors).toHaveLength(4);
      expect(result.actors?.find(a => a.role_type === 'main_actor')).toBeDefined();
      expect(result.actors?.find(a => a.role_type === 'supporting_actor')).toBeDefined();
      expect(result.actors?.find(a => a.role_type === 'guest_actor')).toBeDefined();
      expect(result.actors?.find(a => a.role_type === 'voice_actor')).toBeDefined();
    });

    it('should support different role types for directors', async () => {
      const directorsWithVariedRoles: PublicPersonSimple[] = [
        { id: 'person-1', full_name: 'Main Director', role_type: 'main_director' },
        { id: 'person-2', full_name: 'Assistant Director', role_type: 'assistant_director' },
        { id: 'person-3', full_name: 'Second Unit Director', role_type: 'second_unit_director' },
      ];

      const mediaWithVariedDirectors: MediaDescription = {
        ...mockMediaWithRelationships,
        directors: directorsWithVariedRoles,
      };

      mockApiClient.get.mockResolvedValue({ data: mediaWithVariedDirectors });

      const result = await mediaApi.getMediaDescription('media-test');

      expect(result.directors).toHaveLength(3);
      expect(result.directors?.find(d => d.role_type === 'main_director')).toBeDefined();
      expect(result.directors?.find(d => d.role_type === 'assistant_director')).toBeDefined();
      expect(result.directors?.find(d => d.role_type === 'second_unit_director')).toBeDefined();
    });

    it('should support different role types for producers', async () => {
      const producersWithVariedRoles: PublicPersonSimple[] = [
        { id: 'person-1', full_name: 'Executive Producer', role_type: 'executive_producer' },
        { id: 'person-2', full_name: 'Line Producer', role_type: 'line_producer' },
        { id: 'person-3', full_name: 'Associate Producer', role_type: 'associate_producer' },
        { id: 'person-4', full_name: 'Co-Producer', role_type: 'co_producer' },
      ];

      const mediaWithVariedProducers: MediaDescription = {
        ...mockMediaWithRelationships,
        producers: producersWithVariedRoles,
      };

      mockApiClient.get.mockResolvedValue({ data: mediaWithVariedProducers });

      const result = await mediaApi.getMediaDescription('media-test');

      expect(result.producers).toHaveLength(4);
      expect(result.producers?.find(p => p.role_type === 'executive_producer')).toBeDefined();
      expect(result.producers?.find(p => p.role_type === 'line_producer')).toBeDefined();
      expect(result.producers?.find(p => p.role_type === 'associate_producer')).toBeDefined();
      expect(result.producers?.find(p => p.role_type === 'co_producer')).toBeDefined();
    });
  });

  describe('MediaDescription Creation with Relationship IDs', () => {
    it('should create media description with relationship ID arrays', async () => {
      const createData: MediaDescriptionCreate = {
        file_number: 2024002,
        episode_title: 'New Episode with Relationships',
        media_type: 'video',
        slug: 'new_episode_with_relationships',
        
        // NEW: Relationship ID fields for creation
        actor_ids: ['person-1', 'person-2', 'person-3'],
        director_ids: ['person-4', 'person-5'],
        producer_ids: ['person-6', 'person-7'],
        media_theme_ids: ['theme-1', 'theme-2', 'theme-3'],
        additional_image_ids: ['image-1', 'image-2'],
      };

      const createdMedia: MediaDescription = {
        id: 'created-media-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        ...createData,
        
        // Backend returns relationship objects after creation
        actors: mockMediaWithRelationships.actors,
        directors: mockMediaWithRelationships.directors,
        producers: mockMediaWithRelationships.producers,
        media_themes: mockMediaWithRelationships.media_themes,
        additional_images: mockMediaWithRelationships.additional_images?.slice(0, 2),
      };

      mockApiClient.post.mockResolvedValue({ data: createdMedia });

      const result = await mediaApi.createMediaDescription(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/media-descriptions', createData);
      expect(result.actors).toHaveLength(3);
      expect(result.directors).toHaveLength(2);
      expect(result.producers).toHaveLength(2);
      expect(result.media_themes).toHaveLength(3);
      expect(result.additional_images).toHaveLength(2);
    });

    it('should handle empty relationship ID arrays in creation', async () => {
      const createData: MediaDescriptionCreate = {
        file_number: 2024003,
        episode_title: 'Episode with No Relationships',
        media_type: 'video',
        
        // Empty relationship arrays
        actor_ids: [],
        director_ids: [],
        producer_ids: [],
        media_theme_ids: [],
        additional_image_ids: [],
      };

      const createdMedia: MediaDescription = {
        id: 'created-empty-media-id',
        creation_date_utc: '2024-01-15T10:30:00Z',
        ...createData,
        
        // Empty relationship objects
        actors: [],
        directors: [],
        producers: [],
        media_themes: [],
        additional_images: [],
      };

      mockApiClient.post.mockResolvedValue({ data: createdMedia });

      const result = await mediaApi.createMediaDescription(createData);

      expect(result.actors).toEqual([]);
      expect(result.directors).toEqual([]);
      expect(result.producers).toEqual([]);
      expect(result.media_themes).toEqual([]);
      expect(result.additional_images).toEqual([]);
    });
  });

  describe('MediaDescription Updates with Relationship IDs', () => {
    it('should update media description relationship IDs', async () => {
      const updateData: MediaDescriptionUpdate = {
        episode_title: 'Updated Episode Title',
        
        // Update relationship ID arrays
        actor_ids: ['person-8', 'person-9'], // Different actors
        director_ids: ['person-10'], // Different directors
        producer_ids: ['person-11', 'person-12', 'person-13'], // More producers
        media_theme_ids: ['theme-4'], // Different theme
        additional_image_ids: ['image-4', 'image-5', 'image-6'], // Different images
      };

      const updatedMedia: MediaDescription = {
        ...mockMediaWithRelationships,
        episode_title: 'Updated Episode Title',
        
        // Updated relationship objects
        actors: [
          { id: 'person-8', full_name: 'New Actor 1', role_type: 'main_actor' },
          { id: 'person-9', full_name: 'New Actor 2', role_type: 'supporting_actor' },
        ],
        directors: [
          { id: 'person-10', full_name: 'New Director', role_type: 'main_director' },
        ],
        producers: [
          { id: 'person-11', full_name: 'New Producer 1', role_type: 'executive_producer' },
          { id: 'person-12', full_name: 'New Producer 2', role_type: 'line_producer' },
          { id: 'person-13', full_name: 'New Producer 3', role_type: 'associate_producer' },
        ],
        media_themes: [
          { id: 'theme-4', theme_name: 'documentary' },
        ],
        additional_images: [
          { id: 'image-4', file_name: 'new_poster_1.jpg' },
          { id: 'image-5', file_name: 'new_poster_2.jpg' },
          { id: 'image-6', file_name: 'new_behind_scenes.jpg' },
        ],
      };

      mockApiClient.put.mockResolvedValue({ data: updatedMedia });

      const result = await mediaApi.updateMediaDescription('media-test', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/media-descriptions/media-test', updateData);
      expect(result.episode_title).toBe('Updated Episode Title');
      expect(result.actors).toHaveLength(2);
      expect(result.directors).toHaveLength(1);
      expect(result.producers).toHaveLength(3);
      expect(result.media_themes).toHaveLength(1);
      expect(result.additional_images).toHaveLength(3);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with deprecated ID list fields', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockMediaWithRelationships });

      const result = await mediaApi.getMediaDescription('media-test');

      // New relationship objects should exist
      expect(result.actors).toBeDefined();
      expect(result.directors).toBeDefined();
      expect(result.producers).toBeDefined();

      // Deprecated fields should still exist for backward compatibility
      expect(result.actors_id_list).toEqual(['person-1', 'person-2', 'person-3']);
      expect(result.directors_id_list).toEqual(['person-4', 'person-5']);
      expect(result.producers_id_list).toEqual(['person-6', 'person-7']);
      expect(result.additional_images_id_list).toEqual(['image-1', 'image-2', 'image-3']);
    });

    it('should handle media descriptions that only have deprecated fields', async () => {
      const legacyMediaDescription: MediaDescription = {
        id: 'legacy-media',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_number: 2024004,
        episode_title: 'Legacy Media Description',
        media_type: 'video',
        
        // Only deprecated fields, no relationship objects
        actors_id_list: ['person-1', 'person-2'],
        directors_id_list: ['person-3'],
        producers_id_list: ['person-4'],
        additional_images_id_list: ['image-1'],
      };

      mockApiClient.get.mockResolvedValue({ data: legacyMediaDescription });

      const result = await mediaApi.getMediaDescription('legacy-media');

      expect(result.actors_id_list).toEqual(['person-1', 'person-2']);
      expect(result.directors_id_list).toEqual(['person-3']);
      expect(result.producers_id_list).toEqual(['person-4']);
      expect(result.additional_images_id_list).toEqual(['image-1']);
      
      // Relationship objects should be undefined or empty in legacy data
      expect(result.actors).toBeUndefined();
      expect(result.directors).toBeUndefined();
      expect(result.producers).toBeUndefined();
      expect(result.additional_images).toBeUndefined();
    });
  });

  describe('Error Handling for Relationship Operations', () => {
    it('should handle invalid relationship IDs during creation', async () => {
      const createDataWithInvalidIds: MediaDescriptionCreate = {
        file_number: 2024005,
        episode_title: 'Episode with Invalid IDs',
        media_type: 'video',
        actor_ids: ['invalid-person-id'],
        media_theme_ids: ['invalid-theme-id'],
      };

      const validationError = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid relationship IDs provided',
              details: {
                invalid_actor_ids: ['invalid-person-id'],
                invalid_theme_ids: ['invalid-theme-id'],
              },
            },
          },
        },
      };

      mockApiClient.post.mockRejectedValue(validationError);

      await expect(mediaApi.createMediaDescription(createDataWithInvalidIds))
        .rejects.toMatchObject({
          response: {
            status: 400,
            data: {
              error: {
                code: 'VALIDATION_ERROR',
              },
            },
          },
        });
    });

    it('should handle relationship objects with missing required fields', async () => {
      const incompleteRelationshipMedia: MediaDescription = {
        id: 'incomplete-media',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_number: 2024006,
        episode_title: 'Media with Incomplete Relationships',
        media_type: 'video',
        
        // Relationship objects missing required fields
        actors: [
          { id: 'person-1', full_name: '', role_type: 'main_actor' }, // Empty name
          // @ts-expect-error Testing invalid data
          { id: 'person-2', full_name: 'Valid Name' }, // Missing role_type
        ],
      };

      mockApiClient.get.mockResolvedValue({ data: incompleteRelationshipMedia });

      const result = await mediaApi.getMediaDescription('incomplete-media');

      // Should still return the data even if some fields are incomplete
      expect(result.actors).toHaveLength(2);
      expect(result.actors?.[0].full_name).toBe('');
      expect(result.actors?.[1].full_name).toBe('Valid Name');
    });
  });

  describe('Performance and Large Dataset Handling', () => {
    it('should handle media descriptions with many relationship objects', async () => {
      const largeDataset: MediaDescription = {
        id: 'large-dataset-media',
        creation_date_utc: '2024-01-15T10:30:00Z',
        file_number: 2024007,
        episode_title: 'Media with Large Relationship Dataset',
        media_type: 'video',
        
        // Large arrays to test performance
        actors: Array.from({ length: 50 }, (_, i) => ({
          id: `actor-${i + 1}`,
          full_name: `Actor ${i + 1}`,
          role_type: i < 10 ? 'main_actor' : 'supporting_actor',
        })),
        directors: Array.from({ length: 10 }, (_, i) => ({
          id: `director-${i + 1}`,
          full_name: `Director ${i + 1}`,
          role_type: i === 0 ? 'main_director' : 'assistant_director',
        })),
        producers: Array.from({ length: 20 }, (_, i) => ({
          id: `producer-${i + 1}`,
          full_name: `Producer ${i + 1}`,
          role_type: i < 5 ? 'executive_producer' : 'line_producer',
        })),
        media_themes: Array.from({ length: 15 }, (_, i) => ({
          id: `theme-${i + 1}`,
          theme_name: `Theme ${i + 1}`,
        })),
        additional_images: Array.from({ length: 30 }, (_, i) => ({
          id: `image-${i + 1}`,
          file_name: `image_${i + 1}.jpg`,
        })),
      };

      mockApiClient.get.mockResolvedValue({ data: largeDataset });

      const result = await mediaApi.getMediaDescription('large-dataset-media');

      expect(result.actors).toHaveLength(50);
      expect(result.directors).toHaveLength(10);
      expect(result.producers).toHaveLength(20);
      expect(result.media_themes).toHaveLength(15);
      expect(result.additional_images).toHaveLength(30);
      
      // Verify performance doesn't degrade with large datasets
      const startTime = performance.now();
      const processedActors = result.actors?.filter(a => a.role_type === 'main_actor');
      const endTime = performance.now();
      
      expect(processedActors).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(10); // Should process in under 10ms
    });
  });
});