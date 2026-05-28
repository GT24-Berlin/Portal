import type { Metadata } from 'next';
import WorkspacesPageClient from '@/app/dashboard/workspaces/workspaces-page-client';

export const metadata: Metadata = {
  title: 'Organisationen'
};

export default function WorkspacesPage() {
  return <WorkspacesPageClient />;
}
