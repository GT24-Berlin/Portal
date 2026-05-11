import PageContainer from '@/components/layout/page-container';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';
import { requireRole, isAdmin, isPartner } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import AdminDashboardView from '@/features/admin-dashboard/components/admin-dashboard-view';
import { getAdminDashboardData } from '@/features/admin-dashboard/lib/get-admin-dashboard-data';
import PartnerDashboardView from '@/features/partner-dashboard/components/partner-dashboard-view';
import { getPartnerDashboardData } from '@/features/partner-dashboard/lib/get-partner-dashboard-data';

export default async function OverViewLayout() {
  const guard = await requireRole();

  if (!guard.ok) {
    redirect('/auth/sign-in');
  }

  const role = guard.role;

  if (isAdmin(role)) {
    try {
      const data = await getAdminDashboardData();

      return (
        <PageContainer
          pageTitle='Admin Dashboard'
          pageDescription='Operativer Überblick über Fälle, Zuweisungen und Ereignisse'
        >
          <AdminDashboardView data={data} />
        </PageContainer>
      );
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return (
          <DatabaseUnavailableState
            title='Admin Dashboard ist gerade nicht verfügbar'
            description='Die Übersichtsseite kann im Moment keine Daten aus der Datenbank laden.'
            retryHref='/dashboard/overview'
            retryLabel='Erneut laden'
          />
        );
      }

      throw error;
    }
  }

  if (isPartner(role)) {
    try {
      const data = await getPartnerDashboardData({
        userId: guard.userId!,
        role: role as 'GUTACHTER' | 'ANWALT'
      });

      return (
        <PageContainer
          pageTitle='Partner Dashboard'
          pageDescription='Übersicht über deine Fälle und Aktivitäten'
        >
          <PartnerDashboardView data={data} />
        </PageContainer>
      );
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return (
          <DatabaseUnavailableState
            title='Partner Dashboard ist gerade nicht verfügbar'
            description='Die Übersichtsseite kann im Moment keine Daten aus der Datenbank laden.'
            retryHref='/dashboard/overview'
            retryLabel='Erneut laden'
          />
        );
      }

      throw error;
    }
  }

  redirect('/auth/sign-in');
}
