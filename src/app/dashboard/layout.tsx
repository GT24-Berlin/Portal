import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { InfoSidebar } from '@/components/layout/info-sidebar';
import { InfobarProvider } from '@/components/ui/infobar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireIdentity, getActiveMemberships } from '@/lib/policy';

export const metadata: Metadata = {
  title: {
    default: 'Gutachtery24 Dashboard',
    template: '%s | Gutachtery24'
  },
  description:
    'Operative Bereiche für Fälle, Partner und Organisationen in Gutachtery24'
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const identity = await requireIdentity();
  if (!identity.ok) redirect('/auth/sign-in');

  const memberships = await getActiveMemberships(identity.clerkUserId);
  if (memberships.length === 0) redirect('/no-access');

  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <InfobarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset>
            <Header />
            {/* page main content */}
            {children}
            {/* page main content ends */}
          </SidebarInset>
          <InfoSidebar side='right' />
        </InfobarProvider>
      </SidebarProvider>
    </KBar>
  );
}
