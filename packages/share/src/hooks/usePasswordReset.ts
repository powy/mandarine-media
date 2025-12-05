import { useMutation } from '@tanstack/react-query';
import { passwordResetApi } from '../api/passwordReset';
import { PasswordResetRequest, PasswordResetConfirm } from '../types';

/**
 * Hook for requesting password reset email
 */
export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (data: PasswordResetRequest) => passwordResetApi.requestReset(data),
  });
};

/**
 * Hook for confirming password reset with token
 */
export const useConfirmPasswordReset = () => {
  return useMutation({
    mutationFn: (data: PasswordResetConfirm) => passwordResetApi.confirmReset(data),
  });
};
