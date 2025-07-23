import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { countriesApi, Country, CountryCreate, CountryUpdate } from 'share';
import toast from 'react-hot-toast';

export const useCountriesList = (params?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['countries', 'list', params],
    queryFn: () => countriesApi.getAll(params),
    placeholderData: keepPreviousData,
  });
};

export const useCountryDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['countries', 'detail', id],
    queryFn: () => countriesApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateCountry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CountryCreate) => countriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      toast.success('Country created successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create country';
      toast.error(message);
    },
  });
};

export const useUpdateCountry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CountryUpdate }) => 
      countriesApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      queryClient.setQueryData(['countries', 'detail', data.id], data);
      toast.success('Country updated successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update country';
      toast.error(message);
    },
  });
};

export const useDeleteCountry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => countriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      toast.success('Country deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete country';
      toast.error(message);
    },
  });
};