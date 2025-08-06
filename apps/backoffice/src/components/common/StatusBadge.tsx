import clsx from 'clsx';
import { formatStatusBadge } from '../../utils/formatters';

interface StatusBadgeProps {
  status: string;
  className?: string;
  variant?: string;
  color?: string;
}

export const StatusBadge = ({ status, className, variant, color }: StatusBadgeProps) => {
  const config = formatStatusBadge(status);
  
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  }[config.color] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClasses,
        className
      )}
    >
      {config.label}
    </span>
  );
};