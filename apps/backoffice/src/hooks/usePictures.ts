import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { picturesApi, Picture, PictureCreate, PictureUpdate } from 'share';
import toast from 'react-hot-toast';

export const usePicturesList = (params?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['pictures', 'list', params],
    queryFn: () => picturesApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
};

export const usePictureDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['pictures', 'detail', id],
    queryFn: () => picturesApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreatePicture = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PictureCreate) => picturesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pictures'] });
      toast.success('Picture created successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create picture';
      toast.error(message);
    },
  });
};

export const useUpdatePicture = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PictureUpdate }) => 
      picturesApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pictures'] });
      queryClient.setQueryData(['pictures', 'detail', data.id], data);
      toast.success('Picture updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update picture';
      toast.error(message);
    },
  });
};

export const useDeletePicture = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => picturesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pictures'] });
      toast.success('Picture deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete picture';
      toast.error(message);
    },
  });
};