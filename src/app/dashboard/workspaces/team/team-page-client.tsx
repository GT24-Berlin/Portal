'use client';

import PageContainer from '@/components/layout/page-container';
import { OrganizationProfile } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { teamInfoContent } from '@/config/infoconfig';

export default function TeamPageClient() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <PageContainer
      pageTitle='Organisation'
      pageDescription='Mitglieder, Rollen und Sicherheit für Gutachtery24'
      infoContent={teamInfoContent}
    >
      <OrganizationProfile
        appearance={{
          baseTheme: isDark ? dark : undefined
        }}
      />
    </PageContainer>
  );
}
