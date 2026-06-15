import React from 'react';
import { InfoButton } from '@/components/ui/info-button';
import type { InfobarContent } from '@/components/ui/infobar';

interface HeadingProps {
  title: string;
  description: string;
  infoContent?: InfobarContent;
}

export const Heading: React.FC<HeadingProps> = ({
  title,
  description,
  infoContent
}) => {
  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <h2 className='font-display text-2xl font-bold tracking-[-0.02em] md:text-[2.6rem]'>
          {title}
        </h2>
        {infoContent && (
          <div className='pt-1'>
            <InfoButton content={infoContent} />
          </div>
        )}
      </div>
      <p className='text-muted-foreground max-w-2xl text-sm leading-6 break-words'>
        {description}
      </p>
    </div>
  );
};
