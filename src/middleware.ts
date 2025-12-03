import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware for multi-tenant architecture
 * - Handles tenant isolation
 * - Routes SUPERADMIN to /superadmin
 * - Routes tenant users to their dashboards
 * - Protects tenant-specific routes
 */
export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicRoutes = ['/auth/signin', '/auth/signup', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to signin
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = token.role as string;
  const tenantId = token.tenantId as string | null;
  const activeTenantId = token.activeTenantId as string | null;

  // SUPERADMIN routing logic
  if (role === 'SUPERADMIN') {
    // If SUPERADMIN is accessing /admin routes, they must have activeTenantId set
    if (pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
      if (!activeTenantId) {
        // Redirect to superadmin dashboard to select a tenant first
        return NextResponse.redirect(new URL('/superadmin', request.url));
      }
      // Allow access with activeTenantId set
      return NextResponse.next();
    }

    // Allow SUPERADMIN to access /superadmin routes
    if (pathname.startsWith('/superadmin')) {
      return NextResponse.next();
    }

    // For root path, redirect SUPERADMIN to /superadmin
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/superadmin', request.url));
    }
  }

  // Admin routing - must have tenantId
  if (role === 'ADMIN') {
    if (!tenantId) {
      // Admin without tenant should not exist, but handle gracefully
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Allow admin to access admin routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      return NextResponse.next();
    }

    // Redirect to admin dashboard if accessing root
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Delivery partner routing
  if (role === 'DELIVERY_PARTNER') {
    if (!tenantId) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Allow delivery routes
    if (pathname.startsWith('/delivery') || pathname.startsWith('/api/delivery')) {
      return NextResponse.next();
    }

    // Redirect to delivery dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/delivery', request.url));
    }
  }

  // Customer routing - default for CUSTOMER role
  if (role === 'CUSTOMER') {
    if (!tenantId) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Block access to admin and superadmin routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Allow all other requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)',
  ],
};
