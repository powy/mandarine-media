import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  FilmIcon,
  PlayIcon,
  UsersIcon,
  StarIcon,
  CreditCardIcon,
  TagIcon,
  ChartBarIcon,
  CogIcon,
  FolderIcon,
  LanguageIcon,
  GlobeAltIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
  },
  {
    name: 'Content Management',
    href: '/content',
    icon: FilmIcon,
    children: [
      { name: 'Programs', href: '/programs', icon: FolderIcon },
      { name: 'Media Descriptions', href: '/media', icon: FilmIcon },
      { name: 'Video Files', href: '/videos', icon: PlayIcon },
    ],
  },
  {
    name: 'People & Users',
    href: '/people',
    icon: UsersIcon,
    children: [
      { name: 'Public Persons', href: '/persons', icon: StarIcon },
      { name: 'Users', href: '/users', icon: UsersIcon },
    ],
  },
  {
    name: 'Business',
    href: '/business',
    icon: CreditCardIcon,
    children: [
      { name: 'Subscription Plans', href: '/subscriptions', icon: CreditCardIcon },
      { name: 'Audience Categories', href: '/categories', icon: TagIcon },
    ],
  },
  {
    name: 'Localization',
    href: '/localization',
    icon: LanguageIcon,
    children: [
      { name: 'Languages', href: '/languages', icon: LanguageIcon },
      { name: 'Countries', href: '/countries', icon: GlobeAltIcon },
      { name: 'Territories', href: '/territories', icon: GlobeAltIcon },
    ],
  },
  {
    name: 'Assets',
    href: '/assets',
    icon: PhotoIcon,
    children: [
      { name: 'Pictures', href: '/pictures', icon: PhotoIcon },
    ],
  },
  {
    name: 'System',
    href: '/system',
    icon: CogIcon,
    children: [
      { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
      { name: 'Settings', href: '/settings', icon: CogIcon },
    ],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar = ({ isCollapsed = false }: SidebarProps) => {
  return (
    <div className={clsx(
      'bg-white shadow-lg border-r border-gray-200 transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      <nav className="h-full overflow-y-auto pt-6 pb-4">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavigationGroup
              key={item.name}
              item={item}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </nav>
    </div>
  );
};

interface NavigationGroupProps {
  item: NavigationItem;
  isCollapsed: boolean;
}

const NavigationGroup = ({ item, isCollapsed }: NavigationGroupProps) => {
  if (item.children) {
    return (
      <div className="space-y-1">
        {!isCollapsed && (
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {item.name}
            </h3>
          </div>
        )}
        {item.children.map((child) => (
          <NavigationLink
            key={child.name}
            item={child}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    );
  }

  return (
    <NavigationLink item={item} isCollapsed={isCollapsed} />
  );
};

interface NavigationLinkProps {
  item: NavigationItem;
  isCollapsed: boolean;
}

const NavigationLink = ({ item, isCollapsed }: NavigationLinkProps) => {
  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        clsx(
          'group flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 transition-colors',
          isActive
            ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )
      }
    >
      <item.icon
        className={clsx(
          'flex-shrink-0 h-5 w-5',
          isCollapsed ? 'mx-auto' : 'mr-3'
        )}
        aria-hidden="true"
      />
      {!isCollapsed && (
        <span className="truncate">{item.name}</span>
      )}
    </NavLink>
  );
};