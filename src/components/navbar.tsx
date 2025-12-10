'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShoppingCart, User, LogOut, Package, Settings, Truck, Building2 } from 'lucide-react';
import { Role } from '@/types';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  tenantSlug?: string;
}

export function Navbar({ tenantSlug }: NavbarProps = {}) {
  const { data: session, status } = useSession();
  const [cartCount, setCartCount] = useState(0);

  // Build base URL with tenant if provided
  const baseUrl = tenantSlug ? `/${tenantSlug}` : '';

  useEffect(() => {
    // Update cart count on mount and when changes occur
    const updateCartCount = async () => {
      if (status === 'authenticated') {
        try {
          const res = await fetch(`/api/cart?tenantSlug=${tenantSlug ?? ''}`);
          if (res.ok) {
            const cart = await res.json();
            const count = cart.reduce((total: number, item: { quantity: number }) => total + item.quantity, 0);
            setCartCount(count);
          }
        } catch (error) {
          console.error('Error fetching cart count:', error);
        }
      } else {
        setCartCount(0);
      }
    };

    updateCartCount();

    // Custom event for cart updates
    window.addEventListener('cartUpdated', updateCartCount);

    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, [status, tenantSlug]);

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={baseUrl || '/'} className="text-2xl font-bold text-green-600">
          🍎 {tenantSlug ? tenantSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Fruitland'}
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          <Link href={`${baseUrl}/products`} className="hover:text-green-600 transition">
            Products
          </Link>
          <Link href={`${baseUrl}/bulk-orders`} className="hover:text-green-600 transition">
            Bulk Order
          </Link>
          <Link href={`${baseUrl}/subscriptions`} className="hover:text-green-600 transition">
            Subscriptions
          </Link>
          {session && (
            <Link href={`${baseUrl}/orders`} className="hover:text-green-600 transition">
              My Orders
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Link href={`${baseUrl}/cart`}>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {cartCount}
                </Badge>
              )}
            </Button>
          </Link>
          {session ? (
            <>
              {session.user.role === Role.SUPERADMIN && (
                <Link href="/superadmin">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Superadmin
                  </Button>
                </Link>
              )}
              {session.user.role === Role.ADMIN && (
                <Link href={`${baseUrl}/admin`}>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              {session.user.role === Role.DELIVERY_PARTNER && (
                <Link href={`${baseUrl}/delivery`}>
                  <Button variant="outline" size="sm">
                    <Truck className="h-4 w-4 mr-2" />
                    Deliveries
                  </Button>
                </Link>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {session.user.name || session.user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`${baseUrl}/profile`}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`${baseUrl}/orders`}>
                      <Package className="h-4 w-4 mr-2" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`${baseUrl}/bulk-orders`}>
                      <Building2 className="h-4 w-4 mr-2" />
                      Bulk Order
                    </Link>
                  </DropdownMenuItem>
                  {session.user.role === Role.DELIVERY_PARTNER && (
                    <DropdownMenuItem asChild>
                      <Link href={`${baseUrl}/delivery`}>
                        <Truck className="h-4 w-4 mr-2" />
                        My Deliveries
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href={`${baseUrl}/auth/signin`}>
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href={`${baseUrl}/auth/signup`}>
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
