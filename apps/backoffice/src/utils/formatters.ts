import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date: string | Date) => {
  if (!date) return '-';
  return format(new Date(date), 'MMM dd, yyyy');
};

export const formatDateTime = (date: string | Date) => {
  if (!date) return '-';
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

export const formatRelativeTime = (date: string | Date) => {
  if (!date) return '-';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatDuration = (seconds: number) => {
  if (!seconds || seconds === 0) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

export const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '-';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export const formatNumber = (num: number) => {
  if (!num || num === 0) return '0';
  return new Intl.NumberFormat().format(num);
};

export const formatStatusBadge = (status: string) => {
  const statusConfig = {
    draft: { color: 'gray', label: 'Draft' },
    published: { color: 'green', label: 'Published' },
    archived: { color: 'yellow', label: 'Archived' },
    scheduled: { color: 'blue', label: 'Scheduled' },
    // Video encoding statuses
    pending: { color: 'gray', label: 'Pending' },
    processing: { color: 'blue', label: 'Processing' },
    completed: { color: 'green', label: 'Completed' },
    failed: { color: 'red', label: 'Failed' },
  }[status.toLowerCase()] || { color: 'gray', label: status };

  return statusConfig;
};