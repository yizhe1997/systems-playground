'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Home,
  UserRound,
  FolderKanban,
  BookOpen,
  Layers,
  Briefcase,
  GraduationCap,
  BookMarked,
  Inbox,
  LogOut,
  ExternalLink,
} from 'lucide-react';
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
} from '@/components/ui/sidebar';

export type AdminSection =
  | 'homepage' | 'about' | 'projects' | 'blog' | 'stack' | 'experience' | 'education' | 'credits'
  | 'resume';

type NavItem = { key: AdminSection; label: string; icon: ReactNode };

const contentItems: NavItem[] = [
  { key: 'homepage', label: 'Homepage', icon: <Home /> },
  { key: 'about', label: 'About', icon: <UserRound /> },
  { key: 'projects', label: 'Projects', icon: <FolderKanban /> },
  { key: 'blog', label: 'Blog', icon: <BookOpen /> },
  { key: 'stack', label: 'Stack', icon: <Layers /> },
  { key: 'experience', label: 'Experience', icon: <Briefcase /> },
  { key: 'education', label: 'Education', icon: <GraduationCap /> },
  { key: 'credits', label: 'Credits', icon: <BookMarked /> },
];

const opsItems: NavItem[] = [
  { key: 'resume', label: 'Resume Requests', icon: <Inbox /> },
];

export const sectionLabels: Record<AdminSection, string> = Object.fromEntries(
  [...contentItems, ...opsItems].map((i) => [i.key, i.label])
) as Record<AdminSection, string>;

export const sectionCategories: Record<AdminSection, string> = Object.fromEntries([
  ...contentItems.map((i) => [i.key, 'Content']),
  ...opsItems.map((i) => [i.key, 'Operations']),
]) as Record<AdminSection, string>;

export default function AdminSidebar({
  active,
  onNavigate,
  userEmail,
  isAdmin,
  onSignOut,
}: {
  active: AdminSection;
  onNavigate: (s: AdminSection) => void;
  userEmail: string;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  const renderItems = (items: NavItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton
          isActive={active === item.key}
          tooltip={item.label}
          onClick={() => onNavigate(item.key)}
          className="data-active:bg-[var(--ds-yellow)] data-active:text-black data-active:font-bold data-active:border-2 data-active:border-black data-active:shadow-[2px_2px_0px_0px_#000]"
        >
          {item.icon}
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar variant="inset" className="border-r-2 border-black" style={{ fontFamily: 'var(--ds-font-body)' }}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div
                className="flex aspect-square size-8 items-center justify-center bg-black text-[var(--ds-yellow)] text-xs border-2 border-black"
                style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800, borderRadius: '0.5rem' }}
              >
                YZ
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold" style={{ fontFamily: 'var(--ds-font-display)' }}>
                  Control Plane
                </span>
                <span className="truncate text-xs text-muted-foreground">portfolio</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarMenu>{renderItems(contentItems)}</SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarMenu>{renderItems(opsItems)}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col px-2 py-1.5 min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="truncate font-bold text-xs">{userEmail}</span>
              <span
                className={`truncate text-[10px] uppercase font-bold tracking-wider ${
                  isAdmin ? 'text-[var(--ds-charcoal)]' : 'text-[var(--ds-charcoal)]/50'
                }`}
              >
                {isAdmin ? 'Admin' : 'Read only'}
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="View Portfolio" render={<Link href="/" />}>
              <ExternalLink />
              <span>View Portfolio</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign Out" onClick={onSignOut}>
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
