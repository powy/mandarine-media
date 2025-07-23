import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MediaDescription, mediaDescriptionSchema } from 'share';
import { FormLayout } from '@/components/common';
import { useMediaDetail, useCreateMedia, useUpdateMedia } from '@/hooks/useMediaData';
import { useProgramsList } from '@/hooks/usePrograms';
import { useSeasonsList } from '@/hooks/useSeasons';
import { useLanguagesList } from '@/hooks/useLanguages';
import { useCountriesList } from '@/hooks/useCountries';
import { MEDIA_TYPES, CONTENT_STATUS_OPTIONS, CONTENT_RATINGS, LANGUAGES, GENRES, PROFESSIONS } from '@/utils/constants';
import clsx from 'clsx';

type MediaFormData = Partial<MediaDescription>;

export const MediaDescriptionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: mediaDetail, isLoading: loadingDetail } = useMediaDetail(id);
  const createMutation = useCreateMedia();
  const updateMutation = useUpdateMedia();
  
  // Load reference data
  const { data: programs = [] } = useProgramsList();
  const { data: seasons = [] } = useSeasonsList();
  const { data: languages = [] } = useLanguagesList();
  const { data: countries = [] } = useCountriesList();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    watch,
  } = useForm<MediaFormData>({
    resolver: zodResolver(mediaDescriptionSchema.partial()),
    defaultValues: {
      media_type: 'video',
      content_status: 'draft',
      is_featured: false,
      themes_and_genres_id_list: [],
      subtitle_languages: [],
      keywords: [],
    },
  });

  // Load data for edit mode
  useEffect(() => {
    if (isEdit && mediaDetail) {
      reset(mediaDetail);
    }
  }, [isEdit, mediaDetail, reset]);

  const onSubmit = async (data: MediaFormData) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      navigate('/media');
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const handleCancel = () => {
    navigate('/media');
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const saveDisabled = !isDirty || isLoading;

  if (loadingDetail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <FormLayout
      title={isEdit ? 'Edit Media Description' : 'Create Media Description'}
      subtitle={isEdit ? `Editing: ${mediaDetail?.episode_title}` : 'Add new media content'}
      onSave={handleSubmit(onSubmit)}
      onCancel={handleCancel}
      loading={isLoading}
      saveDisabled={saveDisabled}
      backPath="/media"
    >
      <form className="space-y-8">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="form-label">Title *</label>
              <Controller
                name="episode_title"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={clsx(
                      'form-input',
                      errors.episode_title && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    )}
                    placeholder="Enter media title"
                  />
                )}
              />
              {errors.episode_title && (
                <p className="form-error">{errors.episode_title.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">File Number *</label>
              <Controller
                name="file_number"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={clsx(
                      'form-input',
                      errors.file_number && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    )}
                    placeholder="e.g., K001"
                  />
                )}
              />
              {errors.file_number && (
                <p className="form-error">{errors.file_number.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Media Type *</label>
              <Controller
                name="media_type"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={clsx(
                      'form-input',
                      errors.media_type && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    )}
                  >
                    {MEDIA_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.media_type && (
                <p className="form-error">{errors.media_type.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Episode Number</label>
              <Controller
                name="episode_number"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="1"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Duration (seconds)</label>
              <Controller
                name="duration_seconds"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="3600"
                  />
                )}
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Description</label>
              <Controller
                name="descriptive_summary_text"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={4}
                    className="form-input"
                    placeholder="Brief description of the content"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Content Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Status</label>
              <Controller
                name="content_status"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-input">
                    {CONTENT_STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <label className="form-label">Content Rating</label>
              <Controller
                name="content_warning"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-input">
                    <option value="">Select rating</option>
                    {CONTENT_RATINGS.map((rating) => (
                      <option key={rating.value} value={rating.value}>
                        {rating.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <label className="form-label">Language</label>
              <Controller
                name="original_language"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-input">
                    <option value="">Select language</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <label className="form-label">Production Year</label>
              <Controller
                name="production_year"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 5}
                    className="form-input"
                    placeholder={new Date().getFullYear().toString()}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Media URLs */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Media Assets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Main Thumbnail URL</label>
              <Controller
                name="main_thumbnail_url"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Secondary Thumbnail URL</label>
              <Controller
                name="secondary_thumbnail_url"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/thumbnail2.jpg"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Trailer URL</label>
              <Controller
                name="trailer_url"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/trailer.mp4"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Flags */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <Controller
                name="is_featured"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <input
                    id="is_featured"
                    type="checkbox"
                    checked={value || false}
                    onChange={(e) => onChange(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                )}
              />
              <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-900">
                Featured content
              </label>
            </div>

            <div className="flex items-center">
              <Controller
                name="is_premium_content"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <input
                    id="is_premium_content"
                    type="checkbox"
                    checked={value || false}
                    onChange={(e) => onChange(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                )}
              />
              <label htmlFor="is_premium_content" className="ml-2 block text-sm text-gray-900">
                Premium content (requires subscription)
              </label>
            </div>
          </div>
        </div>

        {/* Program and Season */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Program Organization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Program</label>
              <Controller
                name="program_id"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-input">
                    <option value="">Select program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.program_name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <label className="form-label">Season</label>
              <Controller
                name="season_id"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-input">
                    <option value="">Select season</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        Season {season.season_number}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
        </div>

        {/* v1.4 New Fields - Languages and Countries */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Languages & Countries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Original Languages</label>
              <Controller
                name="original_languages_id"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-input" multiple>
                    {languages.map((language) => (
                      <option key={language.id} value={language.id}>
                        {language.name} ({language.sigle})
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <label className="form-label">Origin Countries</label>
              <Controller
                name="origin_country_id_list"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-input" multiple>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <label className="form-label">Available Countries</label>
              <Controller
                name="available_countries_list"
                control={control}
                render={({ field }) => (
                  <select {...field} className="form-input" multiple>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
        </div>

        {/* v1.4 New Fields - Additional Images */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Full Screen Image</label>
              <Controller
                name="image_fullscreen"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/fullscreen.jpg"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Thumbnail 1</label>
              <Controller
                name="image_thumbnail1"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/thumb1.jpg"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Thumbnail 2</label>
              <Controller
                name="image_thumbnail2"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/thumb2.jpg"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Thumbnail 3</label>
              <Controller
                name="image_thumbnail3"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/thumb3.jpg"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* v1.4 New Fields - Revenue Sharing (Admin Only) */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Sharing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Translation Share (%)</label>
              <Controller
                name="translation_share"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">SACEM Share (%)</label>
              <Controller
                name="sacem_share"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Other Share (%)</label>
              <Controller
                name="other_share"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Revenue Share (%)</label>
              <Controller
                name="revenue_share"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Paid Token Cost</label>
              <Controller
                name="paid_token_cost"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Synopsis */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Synopsis</h3>
          <Controller
            name="synopsis_text"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={6}
                className="form-input"
                placeholder="Detailed synopsis of the content"
              />
            )}
          />
        </div>
      </form>
    </FormLayout>
  );
};