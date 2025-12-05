import { useMutation } from '@tanstack/react-query';
import { registerApi } from '../api/register';
import { UserRegistrationRequest } from '../types';

/**
 * Hook for user registration
 */
export const useRegister = () => {
  return useMutation({
    mutationFn: (data: UserRegistrationRequest) => registerApi.register(data),
  });
};
