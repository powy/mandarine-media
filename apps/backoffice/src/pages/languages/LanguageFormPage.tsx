import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { LanguageCreate, LanguageUpdate } from 'share';
import { FormLayout } from '@/components/common';
import { useLanguageDetail, useCreateLanguage, useUpdateLanguage } from '@/hooks/useLanguages';
import clsx from 'clsx';

type LanguageFormData = LanguageCreate & Partial<LanguageUpdate>;

export const LanguageFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: languageDetail, isLoading: loadingDetail } = useLanguageDetail(id);
  const createMutation = useCreateLanguage();
  const updateMutation = useUpdateLanguage();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<LanguageFormData>({
    defaultValues: {
      name: '',
      sigle: '',
    },
  });

  // Load data for edit mode
  useEffect(() => {
    if (isEdit && languageDetail) {
      reset({
        name: languageDetail.name,
        sigle: languageDetail.sigle,
      });
    }
  }, [isEdit, languageDetail, reset]);

  const onSubmit = async (data: LanguageFormData) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      navigate('/languages');
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const handleCancel = () => {
    navigate('/languages');
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
      title={isEdit ? 'Edit Language' : 'Create Language'}
      subtitle={isEdit ? `Editing: ${languageDetail?.name}` : 'Add new language'}
      onSave={handleSubmit(onSubmit)}
      onCancel={handleCancel}
      loading={isLoading}
      saveDisabled={saveDisabled}
      backPath="/languages"
    >
      <form className="space-y-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Language Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Language Name *</label>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Language name is required' }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={clsx(
                      'form-input',
                      errors.name && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    )}
                    placeholder="e.g., English"
                  />
                )}
              />
              {errors.name && (
                <p className="form-error">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Language Code *</label>
              <Controller
                name="sigle"
                control={control}
                rules={{ 
                  required: 'Language code is required',
                  pattern: {
                    value: /^[a-z]{2}$/,
                    message: 'Language code must be 2 lowercase letters (e.g., en, ko)'
                  }
                }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    maxLength={2}
                    className={clsx(
                      'form-input',
                      errors.sigle && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    )}
                    placeholder="e.g., en"
                  />
                )}
              />
              {errors.sigle && (
                <p className="form-error">{errors.sigle.message}</p>
              )}
            </div>
          </div>
        </div>
      </form>
    </FormLayout>
  );
};