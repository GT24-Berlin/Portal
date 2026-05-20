'use client';

import { useMemo, useState } from 'react';
import CasePhotoLightbox from './case-photo-lightbox';

type CasePhotoItem = {
  id: string;
  title?: string | null;
  filename: string;
  mimeType?: string | null;
  createdAt: Date | string;
};

function fmtDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export default function CasePhotoGalleryClient(props: {
  caseId: string;
  items: CasePhotoItem[];
}) {
  const { caseId, items } = props;
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [activeId, items]
  );

  const activeImageUrl = activeItem
    ? `/api/cases/${caseId}/files/${activeItem.id}/download`
    : null;

  return (
    <>
      <section className='rounded-2xl border bg-white p-6 shadow-sm'>
        <div className='mb-4'>
          <h2 className='text-lg font-semibold'>Schadenfotos</h2>
          <p className='text-sm text-neutral-600'>
            Bilddateien zum Fall in kompakter Übersicht.
          </p>
        </div>

        {items.length === 0 ? (
          <div className='text-sm text-neutral-600'>
            Noch keine Bilder zum Schaden vorhanden.
          </div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {items.map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => setActiveId(item.id)}
                className='group overflow-hidden rounded-xl border border-black/5 bg-neutral-50 text-left'
              >
                <div className='aspect-[4/3] bg-neutral-100'>
                  <img
                    src={`/api/cases/${caseId}/files/${item.id}/download`}
                    alt={item.title ?? item.filename}
                    className='h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]'
                  />
                </div>

                <div className='space-y-1 p-3'>
                  <div className='truncate text-sm font-medium text-neutral-900'>
                    {item.title ?? item.filename}
                  </div>
                  <div className='text-xs text-neutral-500'>
                    {fmtDate(item.createdAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <CasePhotoLightbox
        open={Boolean(activeItem)}
        imageUrl={activeImageUrl}
        title={activeItem?.title ?? activeItem?.filename ?? null}
        onClose={() => setActiveId(null)}
      />
    </>
  );
}
