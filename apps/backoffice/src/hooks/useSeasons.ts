import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonsApi, Season, SeasonCreate, SeasonUpdate } from 'share';
import toast from 'react-hot-toast';

export const useSeasonsList = (params?: { skip?: number; limit?: number; program_id?: string }) => {
  return useQuery({
    queryKey: ['seasons', 'list', params],
    queryFn: () => seasonsApi.getAll(params),
    keepPreviousData: true,
  });
};

export const useSeasonDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['seasons', 'detail', id],
    queryFn: () => seasonsApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateSeason = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: SeasonCreate) => seasonsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Season created successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create season';
      toast.error(message);
    },
  });
};

export const useUpdateSeason = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SeasonUpdate }) => 
      seasonsApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.setQueryData(['seasons', 'detail', data.id], data);
      toast.success('Season updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update season';
      toast.error(message);
    },
  });
};

export const useDeleteSeason = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => seasonsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Season deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete season';
      toast.error(message);
    },
  });
};