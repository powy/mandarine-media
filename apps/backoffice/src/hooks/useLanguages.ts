import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { languagesApi, Language, LanguageCreate, LanguageUpdate } from 'share';
import toast from 'react-hot-toast';

export const useLanguagesList = (params?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['languages', 'list', params],
    queryFn: () => languagesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
};

export const useLanguageDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['languages', 'detail', id],
    queryFn: () => languagesApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateLanguage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: LanguageCreate) => languagesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language created successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create language';
      toast.error(message);
    },
  });
};

export const useUpdateLanguage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LanguageUpdate }) => 
      languagesApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      queryClient.setQueryData(['languages', 'detail', data.id], data);
      toast.success('Language updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update language';
      toast.error(message);
    },
  });
};

export const useDeleteLanguage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => languagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete language';
      toast.error(message);
    },
  });
};