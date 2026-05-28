import type { InfobarContent } from '@/components/ui/infobar';

export const workspacesInfoContent: InfobarContent = {
  title: 'Workspaces Management',
  sections: [
    {
      title: 'Overview',
      description:
        'The Workspaces page allows you to manage your workspaces and switch between them. This feature is powered by Clerk Organizations, which enables multi-tenant workspace management. You can view all available workspaces, create new ones, and switch your active workspace.',
      links: [
        {
          title: 'Clerk Organizations Documentation',
          url: 'https://clerk.com/docs/organizations/overview'
        }
      ]
    },
    {
      title: 'Creating Workspaces',
      description:
        'To create a new workspace, click the "Create Organization" button. You will be prompted to enter a workspace name and configure initial settings. Once created, you can switch to the new workspace and start managing it.',
      links: [
        {
          title: 'Multi-tenant Authentication Guide',
          url: 'https://clerk.com/blog/how-to-build-multitenant-authentication-with-clerk'
        }
      ]
    },
    {
      title: 'Switching Workspaces',
      description:
        'You can switch between workspaces by clicking on a workspace in the list. The selected workspace becomes your active organization context, and all organization-specific features will use this workspace.',
      links: []
    },
    {
      title: 'Workspace Features',
      description:
        'Each workspace operates independently with its own team members, roles, permissions, and billing. This allows you to manage multiple projects or teams within a single account while keeping their data and settings separate.',
      links: []
    },
    {
      title: 'Server-Side Permission Checks',
      description:
        "This application follows Clerk's recommended patterns for multi-tenant authentication. Server-side permission checks ensure that users can only access resources for their active organization.",
      links: [
        {
          title: 'Clerk Organizations Documentation',
          url: 'https://clerk.com/docs/organizations/overview'
        }
      ]
    }
  ]
};

export const teamInfoContent: InfobarContent = {
  title: 'Team Management',
  sections: [
    {
      title: 'Overview',
      description:
        "The Team Management page allows you to manage your workspace team, including members, roles, security settings, and more. This page provides comprehensive organization management through Clerk's OrganizationProfile component.",
      links: [
        {
          title: 'Clerk Organizations Documentation',
          url: 'https://clerk.com/docs/organizations/overview'
        }
      ]
    },
    {
      title: 'Managing Team Members',
      description:
        'You can add, remove, and manage team members from this page. Invite new members by email, assign roles, and control their access levels. Each member can have different permissions based on their role.',
      links: []
    },
    {
      title: 'Roles and Permissions',
      description:
        'Configure default roles and permissions in the Clerk Dashboard under Organizations settings. Roles define what actions team members can perform within the workspace. Common roles include admin, member, and custom roles you define.',
      links: [
        {
          title: 'Clerk Organizations Documentation',
          url: 'https://clerk.com/docs/organizations/overview'
        }
      ]
    },
    {
      title: 'Security Settings',
      description:
        "Manage security settings for your workspace, including authentication requirements, session management, and access controls. These settings help protect your organization's data and resources.",
      links: []
    },
    {
      title: 'Organization Settings',
      description:
        'Configure general organization settings such as name, logo, and other workspace preferences. These settings apply to the entire workspace and affect all team members.',
      links: []
    },
    {
      title: 'Navigation RBAC System',
      description:
        'The application includes a fully client-side navigation filtering system using the `useNav` hook. It supports `requireOrg`, `permission`, and `role` checks for instant access control. Navigation items are configured in `src/config/nav-config.ts` with `access` properties.',
      links: []
    }
  ]
};

export const billingInfoContent: InfobarContent = {
  title: 'Billing & Plans',
  sections: [
    {
      title: 'Overview',
      description:
        "The Billing page allows you to manage your organization's subscription and usage limits. Plans and subscriptions are managed through Clerk Billing for B2B, which provides organization-level subscription management with integrated Stripe payment processing.",
      links: [
        {
          title: 'Clerk Billing Documentation',
          url: 'https://clerk.com/docs/billing/overview'
        }
      ]
    },
    {
      title: 'Available Plans',
      description:
        'View and subscribe to available plans through the pricing table. Plans are created and managed in the Clerk Dashboard. Toggle "Publicly available" on plans to show them in the pricing table. Common plans include free, pro, and team tiers.',
      links: [
        {
          title: 'Clerk Dashboard - Plans',
          url: 'https://dashboard.clerk.com/~/billing/plans'
        }
      ]
    },
    {
      title: 'Plan Features',
      description:
        'Each plan can include specific features that unlock functionality in the application. Features are added to plans in the Clerk Dashboard and can be checked in code using the `has()` function with `feature` checks.',
      links: []
    },
    {
      title: 'Access Control',
      description:
        'Plans and features are used for access control throughout the application. Server-side checks use the `has()` function to verify plan or feature access. Client-side protection uses the `<Protect>` component to conditionally render content based on subscription status.',
      links: []
    },
    {
      title: 'Billing Cost Structure',
      description:
        "Clerk Billing costs 0.7% per transaction, plus transaction fees paid directly to Stripe. Clerk Billing is not the same as Stripe Billing - plans and pricing are managed through the Clerk Dashboard and won't sync with existing Stripe products. Clerk uses Stripe only for payment processing.",
      links: []
    },
    {
      title: 'Setup Requirements',
      description:
        "To enable billing, navigate to Billing Settings in the Clerk Dashboard and enable billing for your application. Choose between Clerk's development gateway (for testing) or your own Stripe account (for production). Note: A Stripe account created for development cannot be used for production.",
      links: [
        {
          title: 'Billing Settings',
          url: 'https://dashboard.clerk.com/~/billing/settings'
        }
      ]
    },
    {
      title: 'Beta Status',
      description:
        'Billing is currently in Beta and its APIs are experimental and may undergo breaking changes. To mitigate potential disruptions, we recommend pinning your SDK and `clerk-js` package versions.',
      links: []
    }
  ]
};
