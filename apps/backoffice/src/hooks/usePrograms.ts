import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programsApi, Program, ProgramCreate, ProgramUpdate } from 'share';
import toast from 'react-hot-toast';

export const useProgramsList = (params?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['programs', 'list', params],
    queryFn: () => programsApi.getAll(params),
    placeholderData: (previousData) => previousData,
  });
};

export const useProgramDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['programs', 'detail', id],
    queryFn: () => programsApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ProgramCreate) => programsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program created successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create program';
      toast.error(message);
    },
  });
};

export const useUpdateProgram = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProgramUpdate }) => 
      programsApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.setQueryData(['programs', 'detail', data.id], data);
      toast.success('Program updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update program';
      toast.error(message);
    },
  });
};

export const useDeleteProgram = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => programsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete program';
      toast.error(message);
    },
  });
};