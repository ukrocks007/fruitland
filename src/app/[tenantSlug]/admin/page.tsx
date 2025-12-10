import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { getTenantBySlug, validateTenantAccess } from '@/lib/tenant';

export default async function TenantAdminDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { tenantSlug } = await params;

  // Validate tenant exists
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    redirect('/');
  }

  // Check authentication and role
  if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERADMIN)) {
    redirect(`/${tenantSlug}/auth/signin?callbackUrl=/${tenantSlug}/admin`);
  }

  // Validate tenant access
  if (!validateTenantAccess(session.user.role, session.user.tenantId, tenant.id)) {
    return redirect('/superadmin');
  }

  // Redirect to orders page as the default view
  redirect(`/${tenantSlug}/admin/orders`);
}
