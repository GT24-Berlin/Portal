'use client';

import PageContainer from '@/components/layout/page-container';
import { partnersMock } from '@/lib/mock/partners';

export default function PartnersPage() {
  return (
    <PageContainer
      pageTitle='Partners'
      pageDescription='Gutachter-Partner & Status'
    >
      <div className='rounded-lg border'>
        <div className='grid grid-cols-5 gap-2 border-b p-3 text-sm font-medium'>
          <div>ID</div>
          <div>Name</div>
          <div>Region</div>
          <div>Status</div>
          <div>Kontakt</div>
        </div>

        {partnersMock.map((p) => (
          <div key={p.id} className='grid grid-cols-5 gap-2 p-3 text-sm'>
            <div className='font-mono'>{p.id}</div>
            <div>{p.name}</div>
            <div>{p.region}</div>
            <div>{p.active ? 'Aktiv' : 'Inaktiv'}</div>
            <div className='text-muted-foreground'>
              {p.email ?? p.phone ?? '-'}
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
