'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  Building2,
  Warehouse,
  Boxes,
  Download,
  RotateCcw,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

const baseNavItems = [
  {
    path: 'pos',
    label: 'POS',
    icon: Store,
    variant: 'outline' as const,
    className: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
  },
  {
    path: 'orders',
    label: 'Orders',
    icon: ShoppingCart,
    variant: 'outline' as const,
  },
  {
    path: 'bulk-orders',
    label: 'Bulk Orders',
    icon: Building2,
    variant: 'outline' as const,
  },
  {
    path: 'refunds',
    label: 'Refunds',
    icon: RotateCcw,
    variant: 'outline' as const,
  },
  {
    path: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    variant: 'outline' as const,
  },
  {
    path: 'analytics-advanced',
    label: 'Advanced',
    icon: TrendingUp,
    variant: 'outline' as const,
  },
  {
    path: 'forecasting',
    label: 'Forecasting',
    icon: TrendingUp,
    variant: 'outline' as const,
  },
  {
    path: 'subscriptions',
    label: 'Subscriptions',
    icon: Package,
    variant: 'outline' as const,
  },
  {
    path: 'subscription-packages',
    label: 'Packages',
    icon: Package,
    variant: 'outline' as const,
  },
  {
    path: 'warehouses',
    label: 'Warehouses',
    icon: Warehouse,
    variant: 'outline' as const,
  },
  {
    path: 'inventory-warehouse',
    label: 'Inventory',
    icon: Boxes,
    variant: 'outline' as const,
  },
  {
    path: 'delivery-agents',
    label: 'Delivery Fleet',
    icon: Truck,
    variant: 'outline' as const,
  },
  {
    path: 'users',
    label: 'Users',
    icon: Users,
    variant: 'outline' as const,
  },
  {
    path: 'products',
    label: 'Products',
    icon: LayoutDashboard,
    variant: 'outline' as const,
  },
  {
    path: 'export',
    label: 'Export',
    icon: Download,
    variant: 'outline' as const,
  },
  {
    path: 'reviews',
    label: 'Reviews',
    icon: MessageSquare,
    variant: 'outline' as const,
  },
  {
    path: 'settings',
    label: 'Settings',
    icon: Settings,
    variant: 'outline' as const,
  },
];

interface AdminNavigationProps {
  tenantSlug?: string;
}

export function AdminNavigation({ tenantSlug }: AdminNavigationProps = {}) {
  const pathname = usePathname();
  const [stats, setStats] = useState<Record<string, number>>({});

  // Build navigation items with tenant-aware hrefs
  const navItems = baseNavItems.map(item => ({
    ...item,
    href: tenantSlug ? `/${tenantSlug}/admin/${item.path}` : `/admin/${item.path}`,
  }));

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const url = tenantSlug 
          ? `/api/admin/nav-stats?tenantSlug=${tenantSlug}`
          : '/api/admin/nav-stats';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && !data.error) {
            setStats(data);
          } else {
            console.error('Invalid stats data received:', data);
          }
        } else {
          console.error('Failed to fetch admin stats:', res.status, res.statusText);
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      }
    };

    fetchStats();

    // Refresh stats every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [tenantSlug]);

  const getBadgeCount = (path: string) => {
    switch (path) {
      case 'orders': return stats.orders;
      case 'bulk-orders': return stats.bulkOrders;
      case 'refunds': return stats.refunds;
      case 'reviews': return stats.reviews;
      case 'inventory-warehouse': return stats.inventory;
      default: return 0;
    }
  };

  return (
    <div className="flex-row justify-between items-center gap-4 mb-8">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-2 sm:flex gap-2 flex-wrap">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const count = getBadgeCount(item.path);

          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? 'default' : item.variant}
              className={`justify-start sm:justify-center relative ${item.className || ''}`}
            >
              <Link href={item.href}>
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
