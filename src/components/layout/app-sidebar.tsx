'use client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from '@/components/ui/sidebar';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { navItems } from '@/config/nav-config';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useFilteredNavItems } from '@/hooks/use-nav';
import {
  IconBell,
  IconChevronRight,
  IconChevronsDown,
  IconCreditCard,
  IconLogout,
  IconUserCircle
} from '@tabler/icons-react';
import { SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import {
  LayoutDashboard,
  KanbanSquare,
  Inbox,
  Users,
  User,
  LogOut,
  Circle,
  Bell
} from 'lucide-react';
import { OrgSwitcher } from '../org-switcher';
import { useNotificationUnread } from '@/hooks/use-notification-unread';

const ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  kanban: KanbanSquare,
  inbox: Inbox,
  teams: Users,
  account: User,
  profile: User,
  login: LogOut,
  bell: Bell
};

export default function AppSidebar() {
  const pathname = usePathname();
  const { isOpen } = useMediaQuery();
  const { user } = useUser();
  const { organization } = useOrganization();
  const router = useRouter();
  const filteredItems = useFilteredNavItems(navItems);

  const { count: unread } = useNotificationUnread();
  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen]);

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarMenu>
            {filteredItems.map((item) => {
              if (!item.url && (!item.items || item.items.length === 0))
                return null;
              const Icon = ICONS[item.icon ?? ''] ?? Circle;
              const itemHasInbox =
                item.url === '/dashboard/inbox' ||
                item.items?.some((s) => s.url === '/dashboard/inbox');

              const isInboxUrl = (url?: string) =>
                String(url) === '/dashboard/inbox';
              return item?.items && item?.items?.length > 0 ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                  className='group/collapsible'
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={pathname === item.url}
                        className='group-data-[collapsible=icon]:justify-center'
                      >
                        <span className='relative inline-flex shrink-0'>
                          <Icon className='h-4 w-4' />
                          {itemHasInbox && Number(unread) > 0 ? (
                            <span className='absolute -top-1 -right-1 inline-flex h-2 w-2 rounded-full bg-red-500' />
                          ) : null}
                        </span>

                        {/* Text im icon-mode verstecken */}
                        <span className='group-data-[collapsible=icon]:hidden'>
                          {item.title}
                        </span>

                        {/* Chevron im icon-mode verstecken */}
                        <IconChevronRight className='ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90' />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.url}
                            >
                              <Link
                                href={subItem.url}
                                className='flex w-full items-center justify-between'
                              >
                                <span>{subItem.title}</span>
                                {isInboxUrl(subItem.url) &&
                                Number(unread) > 0 ? (
                                  <span className='inline-flex h-2 w-2 rounded-full bg-red-500' />
                                ) : null}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url}
                  >
                    <Link
                      href={item.url!}
                      className='flex w-full items-center justify-between'
                    >
                      <span className='flex items-center gap-2'>
                        <Icon />
                        <span>{item.title}</span>
                      </span>

                      {(item.url === '/dashboard/inbox' ||
                        item.url === '/dashboard/admin/notifications') &&
                      Number(unread) > 0 ? (
                        <span className='inline-flex h-2 w-2 shrink-0 rounded-full bg-red-500' />
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  {user && (
                    <UserAvatarProfile
                      className='h-8 w-8 rounded-lg'
                      showInfo
                      user={user}
                    />
                  )}
                  <IconChevronsDown className='ml-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='px-1 py-1.5'>
                    {user && (
                      <UserAvatarProfile
                        className='h-8 w-8 rounded-lg'
                        showInfo
                        user={user}
                      />
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        user?.publicMetadata?.role === 'ADMIN'
                          ? '/dashboard/profile'
                          : '/dashboard/partner-profile'
                      )
                    }
                  >
                    <IconUserCircle className='mr-2 h-4 w-4' />
                    {user?.publicMetadata?.role === 'ADMIN'
                      ? 'Profile'
                      : 'Partnerprofil'}
                  </DropdownMenuItem>

                  {organization && (
                    <DropdownMenuItem
                      onClick={() => router.push('/dashboard/billing')}
                    >
                      <IconCreditCard className='mr-2 h-4 w-4' />
                      Billing
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <IconBell className='mr-2 h-4 w-4' />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <IconLogout className='mr-2 h-4 w-4' />
                  <SignOutButton redirectUrl='/auth/sign-in' />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
