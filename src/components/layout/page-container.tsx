import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heading } from '../ui/heading';
import type { InfobarContent } from '@/components/ui/infobar';

function PageSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4 p-5 md:px-8 md:py-6'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='bg-muted mb-2 h-8 w-48 rounded' />
          <div className='bg-muted h-4 w-96 rounded' />
        </div>
      </div>
      <div className='bg-muted mt-6 h-40 w-full rounded-lg' />
      <div className='bg-muted h-40 w-full rounded-lg' />
    </div>
  );
}

export default function PageContainer({
  children,
  scrollable = true,
  isloading = false,
  access = true,
  accessFallback,
  pageTitle,
  pageDescription,
  infoContent,
  pageHeaderAction
}: {
  children: React.ReactNode;
  scrollable?: boolean;
  isloading?: boolean;
  access?: boolean;
  accessFallback?: React.ReactNode;
  pageTitle?: string;
  pageDescription?: string;
  infoContent?: InfobarContent;
  pageHeaderAction?: React.ReactNode;
}) {
  if (!access) {
    return (
      <div className='flex flex-1 items-center justify-center p-4 md:px-6'>
        {accessFallback ?? (
          <div className='text-muted-foreground text-center text-lg'>
            You do not have access to this page.
          </div>
        )}
      </div>
    );
  }

  const content = isloading ? <PageSkeleton /> : children;

  return scrollable ? (
    <ScrollArea className='h-[calc(100dvh-52px)]'>
      <div className='flex w-full min-w-0 flex-1 flex-col px-3 py-4 md:px-8 md:py-7'>
        <div
          className='lumen-card-horizon mb-4 flex items-start justify-between gap-4 rounded-lg px-4 py-3 md:mb-6 md:px-6 md:py-5'
          style={{
            backgroundColor: 'var(--lumen-panel)',
            backgroundImage: 'var(--lumen-surface-panel)',
            boxShadow: 'var(--lumen-rim),var(--lumen-shadow-card)'
          }}
        >
          <Heading
            title={pageTitle ?? ''}
            description={pageDescription ?? ''}
            infoContent={infoContent}
          />
          {pageHeaderAction && <div>{pageHeaderAction}</div>}
        </div>
        {content}
      </div>
    </ScrollArea>
  ) : (
    <div className='flex flex-1 flex-col px-5 py-5 md:px-8 md:py-7'>
      <div className='border-border/60 bg-background/78 mb-6 flex items-start justify-between gap-4 rounded-[32px] border px-5 py-4 shadow-[var(--shadow-glass)] backdrop-blur-xl md:px-6 md:py-5'>
        <Heading
          title={pageTitle ?? ''}
          description={pageDescription ?? ''}
          infoContent={infoContent}
        />
        {pageHeaderAction && <div>{pageHeaderAction}</div>}
      </div>
      {content}
    </div>
  );
}
