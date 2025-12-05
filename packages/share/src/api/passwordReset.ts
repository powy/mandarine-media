import { apiClient } from './client';
import {
  PasswordResetRequest,
  PasswordResetRequestResponse,
  PasswordResetConfirm,
  PasswordResetConfirmResponse
} from '../types';

export const passwordResetApi = {
  /**
   * Request password reset email
   * @param data Email and captcha token
   * @returns Response with success message
   */
  async requestReset(data: PasswordResetRequest): Promise<PasswordResetRequestResponse> {
    const response = await apiClient.post<PasswordResetRequestResponse>(
      '/password-reset/request',
      data
    );
    return response.data;
  },

  /**
   * Confirm password reset with token
   * @param data Token and new password
   * @returns Response indicating success or failure
   */
  async confirmReset(data: PasswordResetConfirm): Promise<PasswordResetConfirmResponse> {
    const response = await apiClient.post<PasswordResetConfirmResponse>(
      '/password-reset/confirm',
      data
    );
    return response.data;
  },
};
