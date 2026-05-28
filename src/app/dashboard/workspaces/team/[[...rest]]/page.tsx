import type { Metadata } from 'next';
import TeamPageClient from '@/app/dashboard/workspaces/team/team-page-client';

export const metadata: Metadata = {
  title: 'Organisation'
};

export default function TeamPage() {
  return <TeamPageClient />;
}
