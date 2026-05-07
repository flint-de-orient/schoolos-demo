import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import type { SessionTenant } from '@/types/next-auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;

        // Find user by email (unique per tenant slug, but email itself may not be globally unique)
        // We load the first matching active user with their tenant and modules
        const user = await db.user.findFirst({
          where: {
            email,
            isActive: true,
            deletedAt: null,
          },
          include: {
            tenant: {
              include: {
                modules: true,
              },
            },
          },
        });

        if (!user) return null;

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) return null;

        const sessionTenant: SessionTenant = {
          id: user.tenant.id,
          slug: user.tenant.slug,
          name: user.tenant.name,
          shortName: user.tenant.shortName,
          board: user.tenant.board as string,
          city: user.tenant.city,
          state: user.tenant.state,
          headTitle: user.tenant.headTitle,
          headName: user.tenant.headName,
          modules: user.tenant.modules
            .filter((m) => m.isActive)
            .map((m) => m.module as string),
        };

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role as string,
          tenantId: user.tenantId,
          tenant: sessionTenant,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenant = user.tenant;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenant = token.tenant as SessionTenant;
      }
      return session;
    },
  },

  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});
