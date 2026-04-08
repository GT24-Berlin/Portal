import { NavItem } from '@/types';

/**
 * Navigation configuration with RBAC support
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 *
 * RBAC Access Control:
 * Each navigation item can have an `access` property that controls visibility
 * based on permissions, plans, features, roles, and organization context.
 *
 * Examples:
 *
 * 1. Require organization:
 *    access: { requireOrg: true }
 *
 * 2. Require specific permission:
 *    access: { requireOrg: true, permission: 'org:teams:manage' }
 *
 * 3. Require specific plan:
 *    access: { plan: 'pro' }
 *
 * 4. Require specific feature:
 *    access: { feature: 'premium_access' }
 *
 * 5. Require specific role:
 *    access: { role: 'admin' }
 *
 * 6. Multiple conditions (all must be true):
 *    access: { requireOrg: true, permission: 'org:teams:manage', plan: 'pro' }
 *
 * Note: The `visible` function is deprecated but still supported for backward compatibility.
 * Use the `access` property for new items.
 */
export const navItems: NavItem[] = [
  {
    title: 'Leads',
    url: '/dashboard/leads',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['l', 'l'],
    items: []
  },
  {
    title: 'Cases',
    url: '/dashboard/cases',
    icon: 'kanban',
    isActive: false,
    shortcut: ['c', 'c'],
    access: { role: ['admin', 'gutachter', 'anwalt'] },
    items: [
      {
        title: 'Alle Cases',
        url: '/dashboard/cases',
        access: { role: ['admin', 'gutachter', 'anwalt'] },
        items: []
      },
      {
        title: 'Accepted Cases',
        url: '/dashboard/cases?view=accepted',
        access: { role: ['gutachter', 'anwalt'] },
        items: []
      },
      {
        title: 'Pending Cases',
        url: '/dashboard/cases?view=pending',
        access: { role: ['gutachter', 'anwalt'] },
        items: []
      }
    ]
  },
  {
    title: 'Inbox',
    url: '/dashboard/inbox',
    icon: 'inbox',
    isActive: false,
    //  nur Partner (Gutachter/Anwalt) sehen den Hauptpunkt
    access: { role: ['gutachter', 'anwalt'] },
    items: []
  },

  {
    title: 'Notifications',
    url: '/dashboard/admin/notifications',
    icon: 'bell', // falls du kein admin-icon hast
    isActive: false,
    access: { role: 'admin' },
    items: []
  },

  {
    title: 'Partners',
    url: '/dashboard/partners',
    icon: 'teams',
    isActive: false,
    shortcut: ['p', 'p'],
    items: []
  },
  {
    title: 'Account',
    url: '#',
    icon: 'account',
    isActive: true,
    items: [
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: 'profile',
        shortcut: ['m', 'm']
      },
      {
        title: 'Logout',
        url: '/sign-in',
        icon: 'login',
        shortcut: ['o', 'o']
      }
    ]
  }
];
