import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi, MediaDescription, MediaFilters } from 'share';
import toast from 'react-hot-toast';

export const useMediaList = (filters: MediaFilters = {}) => {
  return useQuery({
    queryKey: ['media', 'list', filters],
    queryFn: () => mediaApi.getMediaDescriptions(filters),
    placeholderData: (previousData) => previousData,
  });
};

export const useMediaDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['media', 'detail', id],
    queryFn: () => mediaApi.getMediaDescription(id!),
    enabled: !!id,
  });
};

export const useCreateMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<MediaDescription>) => mediaApi.createMediaDescription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media description created successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create media description';
      toast.error(message);
    },
  });
};

export const useUpdateMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MediaDescription> }) => 
      mediaApi.updateMediaDescription(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.setQueryData(['media', 'detail', data.id], data);
      toast.success('Media description updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update media description';
      toast.error(message);
    },
  });
};

export const useDeleteMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => mediaApi.deleteMediaDescription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media description deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete media description';
      toast.error(message);
    },
  });
};

export const useLikeMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => mediaApi.likeMedia(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.setQueryData(['media', 'detail', data.id], data);
    },
  });
};

export const useShareMedia = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => mediaApi.shareMedia(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.setQueryData(['media', 'detail', data.id], data);
    },
  });
};