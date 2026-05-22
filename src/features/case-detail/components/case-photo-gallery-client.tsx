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
      <section className='border-border/60 bg-card/95 overflow-hidden rounded-[28px] border shadow-sm'>
        <div className='border-border/60 bg-muted/15 border-b p-6'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Medien
          </div>
          <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Schadenfotos
          </h2>
          <p className='text-muted-foreground text-sm'>
            Bilddateien zum Fall in kompakter Übersicht.
          </p>
        </div>

        {items.length === 0 ? (
          <div className='text-muted-foreground p-6 text-sm'>
            Noch keine Bilder zum Schaden vorhanden.
          </div>
        ) : (
          <div className='grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3'>
            {items.map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => setActiveId(item.id)}
                className='group border-border/60 bg-background/80 overflow-hidden rounded-2xl border text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md'
              >
                <div className='bg-muted/20 relative h-52 sm:h-44 lg:h-48'>
                  <img
                    src={`/api/cases/${caseId}/files/${item.id}/download`}
                    alt={item.title ?? item.filename}
                    className='absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]'
                  />
                </div>

                <div className='space-y-1 p-3'>
                  <div className='text-foreground truncate text-sm font-medium'>
                    {item.title ?? item.filename}
                  </div>
                  <div className='text-muted-foreground text-xs'>
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
