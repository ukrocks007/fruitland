import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      tenantId: string | null;
      activeTenantId?: string | null; // For SUPERADMIN to switch between tenants
      image?: string | null;
    };
  }

  interface User {
    role: string;
    tenantId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    id: string;
    tenantId?: string | null;
    activeTenantId?: string | null;
  }
}
