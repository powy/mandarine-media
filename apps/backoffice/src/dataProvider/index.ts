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
  audienceCategoriesApi,
  subscriptionPlansApi,
  videoFileReportsApi,
  getMediaShowcases,
  getMediaShowcase,
  createMediaShowcase,
  updateMediaShowcase,
  deleteMediaShowcase,
  getDescriptionReports,
  getDescriptionReport,
  getScreenDescriptions,
  getScreenDescription,
  createScreenDescription,
  updateScreenDescription,
  deleteScreenDescription,
  getMediaThemes,
  getMediaTheme,
  createMediaTheme,
  updateMediaTheme,
  deleteMediaTheme
} from 'share';
import { resourceMappers } from './mappers';

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const skip = (page - 1) * perPage;
    const filters = params.filter || {};
    const sortField = params.sort?.field;
    const sortOrderRaw = params.sort?.order?.toLowerCase?.();
    const order_by = sortField;
    const order_dir = sortOrderRaw === 'asc' || sortOrderRaw === 'desc' ? sortOrderRaw : undefined;

    try {
      switch (resource) {
        case 'countries':
          const { q: searchQuery, ...otherFilters } = filters;
          const countriesResponse = await countriesApi.getAll({ 
            skip, 
            limit: perPage,
            q: searchQuery,
            order_by,
            order_dir,
            ...otherFilters 
          });
          const countriesData = countriesResponse?.data ?? [];
          const countriesTotal = countriesResponse?.pagination?.total ?? countriesData.length;
          return {
            data: resourceMappers.countries.mapList(countriesData),
            total: countriesTotal,
          };


        case 'media-descriptions':
          const mediaResponse = await mediaApi.getMediaDescriptions({
            skip,
            limit: perPage,
            order_by,
            order_dir,
            ...filters
          });
          const mediaData = mediaResponse?.data ?? [];
          const mediaTotal = mediaResponse?.pagination?.total ?? mediaData.length;
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
            order_by,
            order_dir,
            ...otherLanguageFilters 
          });
          const languagesData = languagesResponse?.data ?? [];
          const languagesTotal = languagesResponse?.pagination?.total ?? languagesData.length;
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
            order_by,
            order_dir,
            ...otherPictureFilters 
          });
          const picturesData = picturesResponse?.data ?? [];
          const picturesTotal = picturesResponse?.pagination?.total ?? picturesData.length;
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
            order_by,
            order_dir,
            ...otherProgramFilters 
          });
          const programsData = programsResponse?.data ?? [];
          const programsTotal = programsResponse?.pagination?.total ?? programsData.length;
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
            order_by,
            order_dir,
            ...otherSeasonFilters 
          });
          const seasonsData = seasonsResponse?.data ?? [];
          const seasonsTotal = seasonsResponse?.pagination?.total ?? seasonsData.length;
          return {
            data: resourceMappers.seasons.mapList(seasonsData),
            total: seasonsTotal,
          };

        case 'persons':  // Add support for 'persons' reference used in React Admin components
        case 'public-persons':
          const { q: personQuery, profession, ...otherPersonFilters } = filters;
          const personsResponse = await personsApi.getAll({ 
            skip, 
            limit: perPage,
            q: personQuery,
            profession,
            order_by,
            order_dir,
            ...otherPersonFilters 
          });
          const personsData = personsResponse?.data ?? [];
          const personsTotal = personsResponse?.pagination?.total ?? personsData.length;
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
            order_by,
            order_dir,
            ...otherUserFilters 
          });
          const usersData = usersResponse?.data ?? [];
          const usersTotal = usersResponse?.pagination?.total ?? usersData.length;
          return {
            data: resourceMappers.users.mapList(usersData),
            total: usersTotal,
          };


        case 'media-showcases':
          const mediaShowcases = await getMediaShowcases({ skip, limit: perPage });
          // Handle both direct array and paginated response formats
          const showcasesData = Array.isArray(mediaShowcases) ? mediaShowcases : mediaShowcases.data || [];
          const showcasesTotal = Array.isArray(mediaShowcases) ? showcasesData.length : mediaShowcases.pagination?.total || showcasesData.length;
          return {
            data: resourceMappers.mediaShowcases.mapList(showcasesData),
            total: showcasesTotal,
          };

        case 'description-reports':
          const descriptionReports = await getDescriptionReports({ skip, limit: perPage });
          // Handle both direct array and paginated response formats
          const descReportsData = Array.isArray(descriptionReports) ? descriptionReports : descriptionReports.data || [];
          const descReportsTotal = Array.isArray(descriptionReports) ? descReportsData.length : descriptionReports.pagination?.total || descReportsData.length;
          return {
            data: descReportsData, // No mapper needed for now, use direct data
            total: descReportsTotal,
          };

        case 'media-description-people':
          // This would need special handling since it doesn't have dedicated API functions yet
          // For now, return empty data
          return {
            data: [],
            total: 0,
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
            order_by,
            order_dir,
            ...filters
          });
          const videoFilesData = videoFilesResponse?.data ?? [];
          const videoFilesTotal = videoFilesResponse?.pagination?.total ?? videoFilesData.length;
          return {
            data: resourceMappers.videoFiles.mapList(videoFilesData),
            total: videoFilesTotal,
          };


        case 'audience-categories':
        case 'audience-category':
          const { q: audienceCategoryQuery, ...otherAudienceCategoryFilters } = filters;
          const audienceCategoriesResponse = await audienceCategoriesApi.getAll({ 
            skip, 
            limit: perPage,
            q: audienceCategoryQuery,
            order_by,
            order_dir,
            ...otherAudienceCategoryFilters 
          });
          const audienceCategoriesData = audienceCategoriesResponse?.data ?? [];
          const audienceCategoriesTotal = audienceCategoriesResponse?.pagination?.total ?? audienceCategoriesData.length;
          return {
            data: resourceMappers.audienceCategories.mapList(audienceCategoriesData),
            total: audienceCategoriesTotal,
          };

        case 'subscription-plans':
        case 'subscription-plan':
          const { q: subscriptionPlanQuery, ...otherSubscriptionPlanFilters } = filters;
          const subscriptionPlansResponse = await subscriptionPlansApi.getAll({ 
            skip, 
            limit: perPage,
            q: subscriptionPlanQuery,
            order_by,
            order_dir,
            ...otherSubscriptionPlanFilters 
          });
          const subscriptionPlansData = subscriptionPlansResponse?.data ?? [];
          const subscriptionPlansTotal = subscriptionPlansResponse?.pagination?.total ?? subscriptionPlansData.length;
          return {
            data: resourceMappers.subscriptionPlans.mapList(subscriptionPlansData),
            total: subscriptionPlansTotal,
          };

        case 'video-file-reports':
          const { event: reportEventFilter, ...otherReportFilters } = filters;
          const reportsResponse = await videoFileReportsApi.getReports({ 
            skip, 
            limit: perPage,
            event: reportEventFilter,
            ...otherReportFilters 
          });
          // Handle both direct array and paginated response formats
          const reportsData = Array.isArray(reportsResponse) ? reportsResponse : reportsResponse.data || [];
          const reportsTotal = Array.isArray(reportsResponse) ? reportsData.length : reportsResponse.pagination?.total || reportsData.length;
          return {
            data: resourceMappers.videoFileReports.mapList(reportsData),
            total: reportsTotal,
          };

        case 'media-themes':
          const { q: themeQuery, ...otherThemeFilters } = filters;
          const mediaThemesResponse = await getMediaThemes({ 
            skip, 
            limit: perPage,
            q: themeQuery,
            order_by,
            order_dir,
            ...otherThemeFilters 
          });
          const mediaThemesData = mediaThemesResponse?.data ?? [];
          const mediaThemesTotal = mediaThemesResponse?.pagination?.total ?? mediaThemesData.length;
          return {
            data: resourceMappers.mediaThemes.mapList(mediaThemesData),
            total: mediaThemesTotal,
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

        case 'persons':  // Support for 'persons' reference
        case 'public-persons':
          const person = await personsApi.getById(id);
          return { data: resourceMappers.publicPersons.mapOne(person) };

        case 'users':
          const user = await usersApi.getById(id); // Keep as string UUID
          return { data: resourceMappers.users.mapOne(user) };


        case 'media-showcases':
          const mediaShowcase = await getMediaShowcase(id);
          return { data: resourceMappers.mediaShowcases.mapOne(mediaShowcase) };

        case 'description-reports':
          const descriptionReport = await getDescriptionReport(id);
          return { data: descriptionReport };

        case 'media-description-people':
          // This would need special handling since it doesn't have dedicated API functions yet
          return { data: { id } };

        case 'screen-descriptions':
          const screenDescription = await getScreenDescription(String(id));
          return { data: resourceMappers.screenContents.mapOne(screenDescription) };

        case 'video-files':
          const videoFile = await mediaApi.getVideoFile(id);
          return { data: resourceMappers.videoFiles.mapOne(videoFile) };


        case 'audience-categories':
        case 'audience-category':
          const audienceCategory = await audienceCategoriesApi.getById(id);
          return { data: resourceMappers.audienceCategories.mapOne(audienceCategory) };

        case 'subscription-plans':
        case 'subscription-plan':
          const subscriptionPlan = await subscriptionPlansApi.getById(id);
          return { data: resourceMappers.subscriptionPlans.mapOne(subscriptionPlan) };

        case 'video-file-reports':
          const report = await videoFileReportsApi.getReport(id);
          return { data: resourceMappers.videoFileReports.mapOne(report) };

        case 'media-themes':
          const mediaTheme = await getMediaTheme(id);
          return { data: resourceMappers.mediaThemes.mapOne(mediaTheme) };

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
    const sortField = params.sort?.field;
    const sortOrderRaw = params.sort?.order?.toLowerCase?.();
    const order_by = sortField;
    const order_dir = sortOrderRaw === 'asc' || sortOrderRaw === 'desc' ? sortOrderRaw : undefined;

    try {
      switch (resource) {
        case 'seasons':
          if (target === 'program_id') {
            const seasonsResponse = await seasonsApi.getAll({
              skip,
              limit: perPage,
              program_id: id,
              order_by,
              order_dir,
              ...filter
            });
            const seasonsData = seasonsResponse?.data ?? [];
            const seasonsTotal = seasonsResponse?.pagination?.total ?? seasonsData.length;
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
              order_by,
              order_dir,
              ...filter
            });
            const mediaData = mediaResponse?.data ?? [];
            const mediaTotal = mediaResponse?.pagination?.total ?? mediaData.length;
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

        case 'persons':  // Support for 'persons' reference
        case 'public-persons':
          const person = await personsApi.create(resourceMappers.publicPersons.mapToCreate(data));
          return { data: resourceMappers.publicPersons.mapOne(person) };

        case 'users':
          const newUser = await authApi.register(resourceMappers.users.mapToCreate(data));
          return { data: resourceMappers.users.mapOne(newUser) };


        case 'media-showcases':
          const newMediaShowcase = await createMediaShowcase(resourceMappers.mediaShowcases.mapToCreate(data));
          return { data: resourceMappers.mediaShowcases.mapOne(newMediaShowcase) };

        case 'description-reports':
          // Description reports are read-only system records
          throw new Error('Description reports cannot be created manually');

        case 'media-description-people':
          // This would need special handling since it doesn't have dedicated API functions yet
          throw new Error('Media description people creation not implemented yet');

        case 'screen-descriptions':
          const screenDescription = await createScreenDescription(resourceMappers.screenContents.mapToCreate(data));
          return { data: resourceMappers.screenContents.mapOne(screenDescription) };

        case 'video-files':
          const videoFile = await mediaApi.createVideoFile(resourceMappers.videoFiles.mapToCreate(data));
          return { data: resourceMappers.videoFiles.mapOne(videoFile) };


        case 'audience-categories':
        case 'audience-category':
          const audienceCategory = await audienceCategoriesApi.create(resourceMappers.audienceCategories.mapToCreate(data));
          return { data: resourceMappers.audienceCategories.mapOne(audienceCategory) };

        case 'subscription-plans':
        case 'subscription-plan':
          const subscriptionPlan = await subscriptionPlansApi.create(resourceMappers.subscriptionPlans.mapToCreate(data));
          return { data: resourceMappers.subscriptionPlans.mapOne(subscriptionPlan) };

        case 'media-themes':
          const newMediaTheme = await createMediaTheme(resourceMappers.mediaThemes.mapToCreate(data));
          return { data: resourceMappers.mediaThemes.mapOne(newMediaTheme) };

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

        case 'persons':  // Support for 'persons' reference
        case 'public-persons':
          const person = await personsApi.update(id, resourceMappers.publicPersons.mapToUpdate(data));
          return { data: resourceMappers.publicPersons.mapOne(person) };

        case 'users':
          const updatedUser = await usersApi.update(id, resourceMappers.users.mapToUpdate(data)); // Keep as string UUID
          return { data: resourceMappers.users.mapOne(updatedUser) };


        case 'media-showcases':
          const updatedMediaShowcase = await updateMediaShowcase(id, resourceMappers.mediaShowcases.mapToUpdate(data));
          return { data: resourceMappers.mediaShowcases.mapOne(updatedMediaShowcase) };

        case 'description-reports':
          // Description reports are read-only system records
          throw new Error('Description reports cannot be updated');

        case 'media-description-people':
          // This would need special handling since it doesn't have dedicated API functions yet
          throw new Error('Media description people updates not implemented yet');

        case 'screen-descriptions':
          const screenDescription = await updateScreenDescription(String(id), resourceMappers.screenContents.mapToUpdate(data));
          return { data: resourceMappers.screenContents.mapOne(screenDescription) };

        case 'video-files':
          const videoFile = await mediaApi.updateVideoFile(id, resourceMappers.videoFiles.mapToUpdate(data));
          return { data: resourceMappers.videoFiles.mapOne(videoFile) };


        case 'audience-categories':
        case 'audience-category':
          const audienceCategory = await audienceCategoriesApi.update(id, resourceMappers.audienceCategories.mapToUpdate(data));
          return { data: resourceMappers.audienceCategories.mapOne(audienceCategory) };

        case 'subscription-plans':
        case 'subscription-plan':
          const subscriptionPlan = await subscriptionPlansApi.update(id, resourceMappers.subscriptionPlans.mapToUpdate(data));
          return { data: resourceMappers.subscriptionPlans.mapOne(subscriptionPlan) };

        case 'media-themes':
          const updatedMediaTheme = await updateMediaTheme(id, resourceMappers.mediaThemes.mapToUpdate(data));
          return { data: resourceMappers.mediaThemes.mapOne(updatedMediaTheme) };

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

        case 'persons':  // Support for 'persons' reference
        case 'public-persons':
          const person = await personsApi.delete(id);
          return { data: resourceMappers.publicPersons.mapOne(person) };


        case 'media-showcases':
          await deleteMediaShowcase(id);
          return { data: { id } }; // deleteMediaShowcase returns void

        case 'description-reports':
          // Description reports are read-only system records
          throw new Error('Description reports cannot be deleted');

        case 'media-description-people':
          // This would need special handling since it doesn't have dedicated API functions yet
          throw new Error('Media description people deletion not implemented yet');

        case 'screen-descriptions':
          await deleteScreenDescription(String(id));
          return { data: { id } }; // deleteScreenDescription returns void

        case 'video-files':
          const deletedVideoFile = await mediaApi.deleteVideoFile(id);
          return { data: resourceMappers.videoFiles.mapOne(deletedVideoFile) };


        case 'audience-categories':
        case 'audience-category':
          const deletedAudienceCategory = await audienceCategoriesApi.delete(id);
          return { data: resourceMappers.audienceCategories.mapOne(deletedAudienceCategory) };

        case 'subscription-plans':
        case 'subscription-plan':
          const deletedSubscriptionPlan = await subscriptionPlansApi.delete(id);
          return { data: resourceMappers.subscriptionPlans.mapOne(deletedSubscriptionPlan) };

        case 'media-themes':
          const deletedMediaTheme = await deleteMediaTheme(id);
          return { data: resourceMappers.mediaThemes.mapOne(deletedMediaTheme) };

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
