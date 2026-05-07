import 'next-auth';
import 'next-auth/jwt';

export interface SessionTenant {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  board: string;
  city: string;
  state: string;
  headTitle: string;
  headName: string;
  modules: string[];
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId: string;
      tenant: SessionTenant;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    tenant: SessionTenant;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    tenantId: string;
    tenant: SessionTenant;
  }
}
