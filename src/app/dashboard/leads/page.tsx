import { redirect } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import LeadsAdminPanel, {
  type LeadRow
} from '@/components/leads/leads-admin-panel';
import { prisma } from '@/lib/prisma';
import { isAdmin, requireRole } from '@/lib/rbac';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LeadsPage() {
  try {
    const guard = await requireRole();
    if (!guard.ok || !isAdmin(guard.role)) {
      redirect('/dashboard');
    }

    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        street: true,
        houseNumber: true,
        zipCode: true,
        city: true,
        region: true,
        source: true,
        externalId: true,
        case: {
          select: {
            id: true,
            token: true,
            caseNumber: true,
            createdAt: true
          }
        }
      }
    });

    return (
      <PageContainer
        pageTitle='Leads'
        pageDescription='Nur für Admins. Leads anlegen und bei Bedarf direkt in Cases umwandeln.'
      >
        <LeadsAdminPanel initialLeads={leads as LeadRow[]} />
      </PageContainer>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableState
          title='Leads sind gerade nicht verfügbar'
          description='Die Seite kann im Moment keine Daten aus der Datenbank laden.'
          retryHref='/dashboard/leads'
          retryLabel='Erneut laden'
        />
      );
    }

    throw error;
  }
}
