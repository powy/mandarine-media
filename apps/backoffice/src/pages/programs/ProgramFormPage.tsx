import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ProgramCreate, ProgramUpdate } from 'share';
import { FormLayout } from '@/components/common';
import { useProgramDetail, useCreateProgram, useUpdateProgram } from '@/hooks/usePrograms';
import clsx from 'clsx';

type ProgramFormData = ProgramCreate & Partial<ProgramUpdate>;

export const ProgramFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: programDetail, isLoading: loadingDetail } = useProgramDetail(id);
  const createMutation = useCreateProgram();
  const updateMutation = useUpdateProgram();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProgramFormData>({
    defaultValues: {
      program_name: '',
      general_media_description: '',
    },
  });

  // Load data for edit mode
  useEffect(() => {
    if (isEdit && programDetail) {
      reset({
        program_name: programDetail.program_name,
        general_media_description: programDetail.general_media_description || '',
      });
    }
  }, [isEdit, programDetail, reset]);

  const onSubmit = async (data: ProgramFormData) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      navigate('/programs');
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const handleCancel = () => {
    navigate('/programs');
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
      title={isEdit ? 'Edit Program' : 'Create Program'}
      subtitle={isEdit ? `Editing: ${programDetail?.program_name}` : 'Add new program'}
      onSave={handleSubmit(onSubmit)}
      onCancel={handleCancel}
      loading={isLoading}
      saveDisabled={saveDisabled}
      backPath="/programs"
    >
      <form className="space-y-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Program Information</h3>
          <div className="space-y-6">
            <div>
              <label className="form-label">Program Name *</label>
              <Controller
                name="program_name"
                control={control}
                rules={{ required: 'Program name is required' }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={clsx(
                      'form-input',
                      errors.program_name && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    )}
                    placeholder="Enter program name"
                  />
                )}
              />
              {errors.program_name && (
                <p className="form-error">{errors.program_name.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">General Description</label>
              <Controller
                name="general_media_description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={4}
                    className="form-input"
                    placeholder="Brief description of the program"
                  />
                )}
              />
            </div>
          </div>
        </div>
      </form>
    </FormLayout>
  );
};