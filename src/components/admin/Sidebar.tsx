'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ href, icon, children }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        isActive && 'bg-muted text-primary'
      )}
    >
      {icon}
      {children}
    </Link>
  );
};

export const Sidebar: React.FC = () => {
  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Settings className="h-6 w-6" />
            <span className="">Admin Panel</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <NavLink href="/admin" icon={<Home className="h-4 w-4" />}>
              Dashboard
            </NavLink>
            <NavLink href="/admin/users" icon={<Users className="h-4 w-4" />}>
              Users
            </NavLink>
            <NavLink
              href="/admin/orders"
              icon={<ShoppingCart className="h-4 w-4" />}
            >
              Orders
            </NavLink>
            <NavLink
              href="/admin/materials"
              icon={<Package className="h-4 w-4" />}
            >
              Materials
            </NavLink>
            <NavLink
              href="/admin/analytics"
              icon={<BarChart3 className="h-4 w-4" />}
            >
              Analytics
            </NavLink>
            <NavLink href="/admin/audit" icon={<History className="h-4 w-4" />}>
              Audit Logs
            </NavLink>
          </nav>
        </div>
      </div>
    </div>
  );
};
