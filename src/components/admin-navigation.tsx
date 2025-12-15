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
    href: '/admin/deliveries',
    label: 'Daily Deliveries',
    icon: Truck,
    variant: 'outline' as const,
  },
  {
    href: '/admin/bulk-orders',
    label: 'Bulk Orders',
    icon: Building2,
    variant: 'outline' as const,
  },
  {
    href: '/admin/refunds',
    label: 'Refunds',
    icon: RotateCcw,
    variant: 'outline' as const,
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3,
    variant: 'outline' as const,
  },
  {
    href: '/admin/analytics-advanced',
    label: 'Advanced',
    icon: TrendingUp,
    variant: 'outline' as const,
  },
  {
    href: '/admin/forecasting',
    label: 'Forecasting',
    icon: TrendingUp,
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
    href: '/admin/warehouses',
    label: 'Warehouses',
    icon: Warehouse,
    variant: 'outline' as const,
  },
  {
    href: '/admin/inventory-warehouse',
    label: 'Inventory',
    icon: Boxes,
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
    href: '/admin/reviews',
    label: 'Reviews',
    icon: MessageSquare,
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
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/nav-stats');
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
  }, []);

  const getBadgeCount = (href: string) => {
    switch (href) {
      case '/admin/orders': return stats.orders;
      case '/admin/bulk-orders': return stats.bulkOrders;
      case '/admin/refunds': return stats.refunds;
      case '/admin/reviews': return stats.reviews;
      case '/admin/inventory-warehouse': return stats.inventory;
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
          const count = getBadgeCount(item.href);

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
