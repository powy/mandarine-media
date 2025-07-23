import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { territoriesApi, Territory, TerritoryCreate, TerritoryUpdate } from 'share';
import toast from 'react-hot-toast';

export const useTerritoriesList = (params?: { skip?: number; limit?: number; country_id?: string }) => {
  return useQuery({
    queryKey: ['territories', 'list', params],
    queryFn: () => territoriesApi.getAll(params),
    keepPreviousData: true,
  });
};

export const useTerritoryDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['territories', 'detail', id],
    queryFn: () => territoriesApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateTerritory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: TerritoryCreate) => territoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      toast.success('Territory created successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create territory';
      toast.error(message);
    },
  });
};

export const useUpdateTerritory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TerritoryUpdate }) => 
      territoriesApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      queryClient.setQueryData(['territories', 'detail', data.id], data);
      toast.success('Territory updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update territory';
      toast.error(message);
    },
  });
};

export const useDeleteTerritory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => territoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      toast.success('Territory deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete territory';
      toast.error(message);
    },
  });
};