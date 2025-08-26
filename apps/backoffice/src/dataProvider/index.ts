import { DataProvider } from 'react-admin';
import {
  authApi,
  countriesApi,
  mediaApi,
  languagesApi,
  picturesApi,
  programsApi,
  seasonsApi,
  personsApi,
  usersApi,
  getContentLists,
  getContentList,
  createContentList,
  updateContentList,
  deleteContentList,
  getScreenDescriptions,
  getScreenDescription,
  createScreenDescription,
  updateScreenDescription,
  deleteScreenDescription
} from 'share';
import { resourceMappers } from './mappers';

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const skip = (page - 1) * perPage;
    const filters = params.filter || {};

    try {
      switch (resource) {
        case 'countries':
          const { q: searchQuery, ...otherFilters } = filters;
          const countriesResponse = await countriesApi.getAll({ 
            skip, 
            limit: perPage,
            q: searchQuery,
            ...otherFilters 
          });
          // Handle both direct array and paginated response formats
          const countriesData = Array.isArray(countriesResponse) ? countriesResponse : countriesResponse.data || [];
          const countriesTotal = Array.isArray(countriesResponse) ? countriesData.length : countriesResponse.pagination?.total || countriesData.length;
          return {
            data: resourceMappers.countries.mapList(countriesData),
            total: countriesTotal,
          };

        case 'media-descriptions':
          const mediaResponse = await mediaApi.getMediaDescriptions({
            skip,
            limit: perPage,
            ...filters
          });
          // Handle both direct array and paginated response formats
          const mediaData = Array.isArray(mediaResponse) ? mediaResponse : mediaResponse.data || [];
          const mediaTotal = Array.isArray(mediaResponse) ? mediaData.length : mediaResponse.pagination?.total || mediaData.length;
          return {
            data: resourceMappers.mediaDescriptions.mapList(mediaData),
            total: mediaTotal,
          };

        case 'languages':
          const { q: languageQuery, ...otherLanguageFilters } = filters;
          const languagesResponse = await languagesApi.getAll({ 
            skip, 
            limit: perPage,
            q: languageQuery,
            ...otherLanguageFilters 
          });
          // Handle both direct array and paginated response formats
          const languagesData = Array.isArray(languagesResponse) ? languagesResponse : languagesResponse.data || [];
          const languagesTotal = Array.isArray(languagesResponse) ? languagesData.length : languagesResponse.pagination?.total || languagesData.length;
          return {
            data: resourceMappers.languages.mapList(languagesData),
            total: languagesTotal,
          };


        case 'pictures':
          const { q: pictureQuery, ...otherPictureFilters } = filters;
          const picturesResponse = await picturesApi.getAll({ 
            skip, 
            limit: perPage,
            q: pictureQuery,
            ...otherPictureFilters 
          });
          // Handle both direct array and paginated response formats
          const picturesData = Array.isArray(picturesResponse) ? picturesResponse : picturesResponse.data || [];
          const picturesTotal = Array.isArray(picturesResponse) ? picturesData.length : picturesResponse.pagination?.total || picturesData.length;
          return {
            data: resourceMappers.pictures.mapList(picturesData),
            total: picturesTotal,
          };

        case 'programs':
          const { q: programQuery, ...otherProgramFilters } = filters;
          const programsResponse = await programsApi.getAll({ 
            skip, 
            limit: perPage,
            q: programQuery,
            ...otherProgramFilters 
          });
          // Handle both direct array and paginated response formats
          const programsData = Array.isArray(programsResponse) ? programsResponse : programsResponse.data || [];
          const programsTotal = Array.isArray(programsResponse) ? programsData.length : programsResponse.pagination?.total || programsData.length;
          return {
            data: resourceMappers.programs.mapList(programsData),
            total: programsTotal,
          };

        case 'seasons':
          const { q: seasonQuery, program_id, ...otherSeasonFilters } = filters;
          const seasonsResponse = await seasonsApi.getAll({ 
            skip, 
            limit: perPage,
            q: seasonQuery,
            program_id,
            ...otherSeasonFilters 
          });
          // Handle both direct array and paginated response formats
          const seasonsData = Array.isArray(seasonsResponse) ? seasonsResponse : seasonsResponse.data || [];
          const seasonsTotal = Array.isArray(seasonsResponse) ? seasonsData.length : seasonsResponse.pagination?.total || seasonsData.length;
          return {
            data: resourceMappers.seasons.mapList(seasonsData),
            total: seasonsTotal,
          };

        case 'public-persons':
          const { q: personQuery, profession, ...otherPersonFilters } = filters;
          const personsResponse = await personsApi.getAll({ 
            skip, 
            limit: perPage,
            q: personQuery,
            profession,
            ...otherPersonFilters 
          });
          // Handle both direct array and paginated response formats
          const personsData = Array.isArray(personsResponse) ? personsResponse : personsResponse.data || [];
          const personsTotal = Array.isArray(personsResponse) ? personsData.length : personsResponse.pagination?.total || personsData.length;
          return {
            data: resourceMappers.publicPersons.mapList(personsData),
            total: personsTotal,
          };

        case 'users':
          const { q: userQuery, is_active, is_admin, ...otherUserFilters } = filters;
          const usersResponse = await usersApi.getAll({ 
            skip, 
            limit: perPage,
            q: userQuery,
            is_active,
            is_admin,
            ...otherUserFilters 
          });
          // Handle both direct array and paginated response formats
          const usersData = Array.isArray(usersResponse) ? usersResponse : usersResponse.data || [];
          const usersTotal = Array.isArray(usersResponse) ? usersData.length : usersResponse.pagination?.total || usersData.length;
          return {
            data: resourceMappers.users.mapList(usersData),
            total: usersTotal,
          };


        case 'content-lists':
          const contentLists = await getContentLists({ skip, limit: perPage });
          // Handle both direct array and paginated response formats
          const contentListsData = Array.isArray(contentLists) ? contentLists : contentLists.data || [];
          const contentListsTotal = Array.isArray(contentLists) ? contentListsData.length : contentLists.pagination?.total || contentListsData.length;
          return {
            data: resourceMappers.contentLists.mapList(contentListsData),
            total: contentListsTotal,
          };

        case 'screen-descriptions':
          const screenDescriptions = await getScreenDescriptions({ skip, limit: perPage });
          // Handle both direct array and paginated response formats
          const screenDescriptionsData = Array.isArray(screenDescriptions) ? screenDescriptions : screenDescriptions.data || [];
          const screenDescriptionsTotal = Array.isArray(screenDescriptions) ? screenDescriptionsData.length : screenDescriptions.pagination?.total || screenDescriptionsData.length;
          return {
            data: resourceMappers.screenContents.mapList(screenDescriptionsData),
            total: screenDescriptionsTotal,
          };

        case 'video-files':
          const videoFilesResponse = await mediaApi.getVideoFiles({
            skip,
            limit: perPage,
            ...filters
          });
          // Handle both direct array and paginated response formats
          const videoFilesData = Array.isArray(videoFilesResponse) ? videoFilesResponse : videoFilesResponse.data || [];
          const videoFilesTotal = Array.isArray(videoFilesResponse) ? videoFilesData.length : videoFilesResponse.pagination?.total || videoFilesData.length;
          return {
            data: resourceMappers.videoFiles.mapList(videoFilesData),
            total: videoFilesTotal,
          };


        default:
          throw new Error(`Unknown resource: ${resource}`);
      }
    } catch (error) {
      console.error(`Error fetching ${resource}:`, error);
      throw error;
    }
  },

  getOne: async (resource, params) => {
    const { id } = params;

    try {
      switch (resource) {
        case 'countries':
          const country = await countriesApi.getById(id);
          return { data: resourceMappers.countries.mapOne(country) };

        case 'media-descriptions':
          const media = await mediaApi.getMediaDescription(id);
          return { data: resourceMappers.mediaDescriptions.mapOne(media) };

        case 'languages':
          const language = await languagesApi.getById(id);
          return { data: resourceMappers.languages.mapOne(language) };


        case 'pictures':
          const picture = await picturesApi.getById(id);
          return { data: resourceMappers.pictures.mapOne(picture) };

        case 'programs':
          const program = await programsApi.getById(id);
          return { data: resourceMappers.programs.mapOne(program) };

        case 'seasons':
          const season = await seasonsApi.getById(id);
          return { data: resourceMappers.seasons.mapOne(season) };

        case 'public-persons':
          const person = await personsApi.getById(id);
          return { data: resourceMappers.publicPersons.mapOne(person) };

        case 'users':
          const user = await usersApi.getById(id); // Keep as string UUID
          return { data: resourceMappers.users.mapOne(user) };


        case 'content-lists':
          const contentList = await getContentList(id);
          return { data: resourceMappers.contentLists.mapOne(contentList) };

        case 'screen-descriptions':
          const screenDescription = await getScreenDescription(String(id));
          return { data: resourceMappers.screenContents.mapOne(screenDescription) };

        case 'video-files':
          const videoFile = await mediaApi.getVideoFile(id);
          return { data: resourceMappers.videoFiles.mapOne(videoFile) };


        default:
          throw new Error(`Unknown resource: ${resource}`);
      }
    } catch (error) {
      console.error(`Error fetching ${resource} with id ${id}:`, error);
      throw error;
    }
  },

  getMany: async (resource, params) => {
    // For now, make individual requests - can optimize later with batch endpoints
    const { ids } = params;
    const promises = ids.map((id) => 
      dataProvider.getOne(resource, { id }).then((result) => result.data)
    );
    const data = await Promise.all(promises);
    return { data };
  },

  getManyReference: async (resource, params) => {
    // Handle relations - e.g., get seasons for a program
    const { target, id, pagination, filter } = params;
    const { page, perPage } = pagination;
    const skip = (page - 1) * perPage;

    try {
      switch (resource) {
        case 'seasons':
          if (target === 'program_id') {
            const seasonsResponse = await seasonsApi.getAll({
              skip,
              limit: perPage,
              program_id: id,
              ...filter
            });
            // Handle both direct array and paginated response formats
            const seasonsData = Array.isArray(seasonsResponse) ? seasonsResponse : seasonsResponse.data || [];
            const seasonsTotal = Array.isArray(seasonsResponse) ? seasonsData.length : seasonsResponse.pagination?.total || seasonsData.length;
            return {
              data: resourceMappers.seasons.mapList(seasonsData),
              total: seasonsTotal,
            };
          }
          break;

        case 'media-descriptions':
          if (target === 'program_id') {
            const mediaResponse = await mediaApi.getMediaDescriptions({
              skip,
              limit: perPage,
              ...filter
            });
            // Handle both direct array and paginated response formats
            const mediaData = Array.isArray(mediaResponse) ? mediaResponse : mediaResponse.data || [];
            const mediaTotal = Array.isArray(mediaResponse) ? mediaData.length : mediaResponse.pagination?.total || mediaData.length;
            return {
              data: resourceMappers.mediaDescriptions.mapList(mediaData),
              total: mediaTotal,
            };
          }
          break;
      }

      // Fallback: filter regular getList by target field
      return dataProvider.getList(resource, {
        pagination: { page, perPage },
        sort: params.sort,
        filter: { ...filter, [target]: id },
      });
    } catch (error) {
      console.error(`Error fetching ${resource} with ${target}=${id}:`, error);
      throw error;
    }
  },

  create: async (resource, params) => {
    const { data } = params;

    try {
      switch (resource) {
        case 'countries':
          const country = await countriesApi.create(resourceMappers.countries.mapToCreate(data));
          return { data: resourceMappers.countries.mapOne(country) };

        case 'media-descriptions':
          const media = await mediaApi.createMediaDescription(resourceMappers.mediaDescriptions.mapToCreate(data));
          return { data: resourceMappers.mediaDescriptions.mapOne(media) };

        case 'languages':
          const language = await languagesApi.create(resourceMappers.languages.mapToCreate(data));
          return { data: resourceMappers.languages.mapOne(language) };


        case 'pictures':
          const picture = await picturesApi.create(resourceMappers.pictures.mapToCreate(data));
          return { data: resourceMappers.pictures.mapOne(picture) };

        case 'programs':
          const program = await programsApi.create(resourceMappers.programs.mapToCreate(data));
          return { data: resourceMappers.programs.mapOne(program) };

        case 'seasons':
          const season = await seasonsApi.create(resourceMappers.seasons.mapToCreate(data));
          return { data: resourceMappers.seasons.mapOne(season) };

        case 'public-persons':
          const person = await personsApi.create(resourceMappers.publicPersons.mapToCreate(data));
          return { data: resourceMappers.publicPersons.mapOne(person) };

        case 'users':
          const newUser = await authApi.register(resourceMappers.users.mapToCreate(data));
          return { data: resourceMappers.users.mapOne(newUser) };


        case 'content-lists':
          const contentList = await createContentList(resourceMappers.contentLists.mapToCreate(data));
          return { data: resourceMappers.contentLists.mapOne(contentList) };

        case 'screen-descriptions':
          const screenDescription = await createScreenDescription(resourceMappers.screenContents.mapToCreate(data));
          return { data: resourceMappers.screenContents.mapOne(screenDescription) };

        case 'video-files':
          const videoFile = await mediaApi.createVideoFile(resourceMappers.videoFiles.mapToCreate(data));
          return { data: resourceMappers.videoFiles.mapOne(videoFile) };


        default:
          throw new Error(`Create not implemented for resource: ${resource}`);
      }
    } catch (error) {
      console.error(`Error creating ${resource}:`, error);
      throw error;
    }
  },

  update: async (resource, params) => {
    const { id, data } = params;

    try {
      switch (resource) {
        case 'countries':
          const country = await countriesApi.update(id, resourceMappers.countries.mapToUpdate(data));
          return { data: resourceMappers.countries.mapOne(country) };

        case 'media-descriptions':
          const media = await mediaApi.updateMediaDescription(id, resourceMappers.mediaDescriptions.mapToUpdate(data));
          return { data: resourceMappers.mediaDescriptions.mapOne(media) };

        case 'languages':
          const language = await languagesApi.update(id, resourceMappers.languages.mapToUpdate(data));
          return { data: resourceMappers.languages.mapOne(language) };


        case 'pictures':
          const picture = await picturesApi.update(id, resourceMappers.pictures.mapToUpdate(data));
          return { data: resourceMappers.pictures.mapOne(picture) };

        case 'programs':
          const program = await programsApi.update(id, resourceMappers.programs.mapToUpdate(data));
          return { data: resourceMappers.programs.mapOne(program) };

        case 'seasons':
          const season = await seasonsApi.update(id, resourceMappers.seasons.mapToUpdate(data));
          return { data: resourceMappers.seasons.mapOne(season) };

        case 'public-persons':
          const person = await personsApi.update(id, resourceMappers.publicPersons.mapToUpdate(data));
          return { data: resourceMappers.publicPersons.mapOne(person) };

        case 'users':
          const updatedUser = await usersApi.update(id, resourceMappers.users.mapToUpdate(data)); // Keep as string UUID
          return { data: resourceMappers.users.mapOne(updatedUser) };


        case 'content-lists':
          const contentList = await updateContentList(id, resourceMappers.contentLists.mapToUpdate(data));
          return { data: resourceMappers.contentLists.mapOne(contentList) };

        case 'screen-descriptions':
          const screenDescription = await updateScreenDescription(String(id), resourceMappers.screenContents.mapToUpdate(data));
          return { data: resourceMappers.screenContents.mapOne(screenDescription) };

        case 'video-files':
          const videoFile = await mediaApi.updateVideoFile(id, resourceMappers.videoFiles.mapToUpdate(data));
          return { data: resourceMappers.videoFiles.mapOne(videoFile) };


        default:
          throw new Error(`Update not implemented for resource: ${resource}`);
      }
    } catch (error) {
      console.error(`Error updating ${resource} with id ${id}:`, error);
      throw error;
    }
  },

  updateMany: async (resource, params) => {
    const { ids, data } = params;
    const promises = ids.map((id) =>
      dataProvider.update(resource, { id, data, previousData: {} })
    );
    const results = await Promise.all(promises);
    return { data: results.map((result) => result.data.id) };
  },

  delete: async (resource, params) => {
    const { id } = params;

    try {
      switch (resource) {
        case 'countries':
          const country = await countriesApi.delete(id);
          return { data: resourceMappers.countries.mapOne(country) };

        case 'media-descriptions':
          const media = await mediaApi.deleteMediaDescription(id);
          return { data: resourceMappers.mediaDescriptions.mapOne(media) };

        case 'languages':
          const language = await languagesApi.delete(id);
          return { data: resourceMappers.languages.mapOne(language) };


        case 'pictures':
          const picture = await picturesApi.delete(id);
          return { data: resourceMappers.pictures.mapOne(picture) };

        case 'programs':
          const program = await programsApi.delete(id);
          return { data: resourceMappers.programs.mapOne(program) };

        case 'seasons':
          const season = await seasonsApi.delete(id);
          return { data: resourceMappers.seasons.mapOne(season) };

        case 'public-persons':
          const person = await personsApi.delete(id);
          return { data: resourceMappers.publicPersons.mapOne(person) };


        case 'content-lists':
          await deleteContentList(id);
          return { data: { id } }; // deleteContentList returns void

        case 'screen-descriptions':
          await deleteScreenDescription(String(id));
          return { data: { id } }; // deleteScreenDescription returns void

        case 'video-files':
          const deletedVideoFile = await mediaApi.deleteVideoFile(id);
          return { data: resourceMappers.videoFiles.mapOne(deletedVideoFile) };


        default:
          throw new Error(`Delete not implemented for resource: ${resource}`);
      }
    } catch (error) {
      console.error(`Error deleting ${resource} with id ${id}:`, error);
      throw error;
    }
  },

  deleteMany: async (resource, params) => {
    const { ids } = params;
    const promises = ids.map((id) =>
      dataProvider.delete(resource, { id, previousData: {} })
    );
    const results = await Promise.all(promises);
    return { data: results.map((result) => result.data.id) };
  },
};