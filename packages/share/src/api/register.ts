import { apiClient } from './client';
import { UserRegistrationRequest, UserRegistrationResponse } from '../types';

export const registerApi = {
  /**
   * Register a new user account
   * @param data Email and captcha token
   * @returns Response with success message
   */
  async register(data: UserRegistrationRequest): Promise<UserRegistrationResponse> {
    const response = await apiClient.post<UserRegistrationResponse>('/register', data);
    return response.data;
  },
};
