import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'fruitland';

// Routes that don't require tenant resolution
const PUBLIC_ROUTES = [
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/api/tenants',
];

// Routes that are tenant-independent
const TENANT_INDEPENDENT_ROUTES = [
  '/superadmin',
  '/auth',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Handle root path
  if (pathname === '/') {
    // Redirect to default tenant or tenant selector
    if (token?.role === 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/superadmin', request.url));
    }
    
    // Redirect to default tenant
    return NextResponse.redirect(new URL(`/${DEFAULT_TENANT_SLUG}`, request.url));
  }

  // Check if route is tenant-independent
  if (TENANT_INDEPENDENT_ROUTES.some((route) => pathname.startsWith(route))) {
    // Superadmin routes require SUPERADMIN role
    if (pathname.startsWith('/superadmin')) {
      if (!token || token.role !== 'SUPERADMIN') {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }
    }
    return NextResponse.next();
  }

  // Extract tenant slug from path
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length === 0) {
    return NextResponse.redirect(new URL(`/${DEFAULT_TENANT_SLUG}`, request.url));
  }

  const tenantSlug = pathSegments[0];

  // Validate tenant exists and is active (in production, check cache/DB)
  // For now, we'll let the app handle tenant validation
  // In production, you might want to check a cache or make a DB query here

  // Access control: Check if user has access to this tenant
  if (token && token.role !== 'SUPERADMIN') {
    // For non-superadmin users, validate tenant access
    const userTenantId = token.tenantId as string | null | undefined;
    
    // We need tenant ID from slug to compare, but that requires a DB call
    // We'll handle this in the app layer for now
    // In production, consider caching tenant slug -> ID mapping in Redis
  }

  // Add tenant slug to request headers for easy access in API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
