import { getTenantBySlug } from '@/lib/tenant';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ tenantSlug: string }> }): Promise<Metadata> {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  
  if (!tenant) {
    return {
      title: 'Tenant Not Found',
    };
  }

  return {
    title: `${tenant.name} - Fresh Fruit Subscriptions & Delivery`,
    description: tenant.description || `Subscribe to fresh, seasonal, and exotic fruits delivered to your doorstep by ${tenant.name}`,
  };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  // Validate tenant exists
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  
  if (!tenant) {
    notFound();
  }

  return <>{children}</>;
}
