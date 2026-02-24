'use client';

import PageContainer from '@/components/layout/page-container';
import { leadsMock } from '@/lib/mock/leads';

export default function LeadsPage() {
  return (
    <PageContainer
      pageTitle='Leads'
      pageDescription='Neue Anfragen, Status und Zuweisung'
    >
      <div className='space-y-4'>
        <div className='rounded-lg border'>
          <div className='grid grid-cols-6 gap-2 border-b p-3 text-sm font-medium'>
            <div>ID</div>
            <div>Name</div>
            <div>Region</div>
            <div>Status</div>
            <div>Quelle</div>
            <div>Erstellt</div>
          </div>

          {leadsMock.map((l) => (
            <div key={l.id} className='grid grid-cols-6 gap-2 p-3 text-sm'>
              <div className='font-mono'>{l.id}</div>
              <div>{l.name}</div>
              <div>{l.region}</div>
              <div>{l.status}</div>
              <div>{l.source}</div>
              <div>{l.createdAt}</div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
