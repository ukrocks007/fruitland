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
import Image from 'next/image';
import { Role } from '@/types';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { data: session, status } = useSession();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Update cart count on mount and when changes occur
    const updateCartCount = async () => {
      if (status === 'authenticated') {
        try {
          const res = await fetch('/api/cart');
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
  }, [status]);

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden ring-1 ring-blue-100 shadow-sm shrink-0">
            <Image
              src="/hazare-logo.png"
              alt="Hazare Dairy Farm logo"
              width={128}
              height={128}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="leading-tight">
            <span className="text-lg md:text-2xl font-extrabold text-blue-600 block">Hazare Dairy Farm</span>
            <span className="text-xs md:text-sm text-gray-500 block -mt-0.5">Fresh dairy &amp; produce</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          <Link href="/products" className="hover:text-green-600 transition">
            Products
          </Link>
          <Link href="/bulk-order" className="hover:text-green-600 transition">
            Bulk Order
          </Link>
          <Link href="/subscriptions" className="hover:text-green-600 transition">
            Subscriptions
          </Link>
          {session && (
            <Link href="/orders" className="hover:text-green-600 transition">
              My Orders
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/cart">
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
              {session.user.role === Role.ADMIN && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              {session.user.role === Role.DELIVERY_PARTNER && (
                <Link href="/delivery">
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
                    <Link href="/profile">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <Package className="h-4 w-4 mr-2" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bulk-order">
                      <Building2 className="h-4 w-4 mr-2" />
                      Bulk Order
                    </Link>
                  </DropdownMenuItem>
                  {session.user.role === Role.DELIVERY_PARTNER && (
                    <DropdownMenuItem asChild>
                      <Link href="/delivery">
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
              <Link href="/auth/signin">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
