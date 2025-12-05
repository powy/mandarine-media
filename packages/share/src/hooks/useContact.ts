import { useMutation } from '@tanstack/react-query';
import { contactApi } from '../api/contact';
import { ContactFormRequest } from '../types';

/**
 * React Query hook for sending contact form submissions
 * @returns Mutation object with mutate function and status
 */
export const useSendContact = () => {
  return useMutation({
    mutationFn: (data: ContactFormRequest) => contactApi.sendContactForm(data),
  });
};
