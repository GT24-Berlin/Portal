import React from 'react';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Breadcrumbs } from '../breadcrumbs';
import SearchInput from '../search-input';
import { UserNav } from './user-nav';

export default function Header() {
  return (
    <header className='sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[var(--lumen-hairline)] bg-[var(--lumen-panel)] px-4 transition-[height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      <div className='flex items-center gap-2 px-3'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        <Breadcrumbs />
      </div>

      <div className='flex items-center gap-2 px-3'>
        <div className='hidden md:flex'>
          <SearchInput />
        </div>
        <UserNav />
      </div>
    </header>
  );
}
