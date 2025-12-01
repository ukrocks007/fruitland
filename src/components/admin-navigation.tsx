'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Store,
  ShoppingCart,
  Package,
  Users,
  LayoutDashboard,
  Settings,
  BarChart3,
  Truck,
  Download,
} from 'lucide-react';

const navItems = [
  {
    href: '/admin/pos',
    label: 'POS',
    icon: Store,
    variant: 'outline' as const,
    className: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
  },
  {
    href: '/admin/orders',
    label: 'Orders',
    icon: ShoppingCart,
    variant: 'outline' as const,
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3,
    variant: 'outline' as const,
  },
  {
    href: '/admin/subscriptions',
    label: 'Subscriptions',
    icon: Package,
    variant: 'outline' as const,
  },
  {
    href: '/admin/subscription-packages',
    label: 'Packages',
    icon: Package,
    variant: 'outline' as const,
  },
  {
    href: '/admin/delivery-agents',
    label: 'Delivery Fleet',
    icon: Truck,
    variant: 'outline' as const,
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
    variant: 'outline' as const,
  },
  {
    href: '/admin/products',
    label: 'Products',
    icon: LayoutDashboard,
    variant: 'outline' as const,
  },
  {
    href: '/admin/export',
    label: 'Export',
    icon: Download,
    variant: 'outline' as const,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    variant: 'outline' as const,
  },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 sm:flex gap-2 flex-wrap">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? 'default' : item.variant}
              className={`justify-start sm:justify-center ${item.className || ''}`}
            >
              <Link href={item.href}>
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
