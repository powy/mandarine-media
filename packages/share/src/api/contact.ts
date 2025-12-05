import { apiClient } from './client';
import { ContactFormRequest, ContactFormResponse } from '../types';

export const contactApi = {
  /**
   * Send contact form submission
   * @param data Contact form data including name, email, subject, message, and Turnstile token
   * @returns Response indicating success or failure
   */
  async sendContactForm(data: ContactFormRequest): Promise<ContactFormResponse> {
    const response = await apiClient.post<ContactFormResponse>('/contact', data);
    return response.data;
  },
};
