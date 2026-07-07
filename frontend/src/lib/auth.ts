import NextAuth from 'next-auth';
import Cognito from 'next-auth/providers/cognito';
import Credentials from 'next-auth/providers/credentials';
import { getToken } from 'next-auth/jwt';
import type { NextAuthConfig } from 'next-auth';
import { isDevSkipAuth } from '@/lib/devMode';

const devProviders = [
  Credentials({
    id: 'dev',
    name: 'Dev (unused)',
    credentials: {},
    authorize: () => ({ id: 'dev-user', email: 'dev@local.test' }),
  }),
];

const prodProviders = [
  Cognito({
    clientId: process.env.COGNITO_CLIENT_ID!,
    clientSecret: process.env.COGNITO_CLIENT_SECRET!,
    issuer: process.env.COGNITO_ISSUER!,
  }),
];
declare module 'next-auth' {
  interface Session {
    error?: 'RefreshTokenError';
    idToken?: string;
    accessToken?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const PROTECTED_ROUTES = ['/projects', '/planner'];

const authConfig: NextAuthConfig = {
  providers: isDevSkipAuth() ? devProviders : prodProviders,
  session: { strategy: 'jwt', maxAge: 4 * 60 * 60 },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.idToken = token.idToken as string | undefined;
      session.user.id = token.sub ?? session.user.id;
      return session;
    },
    authorized({ auth, request }) {
      if (isDevSkipAuth()) return true;
      const path = request.nextUrl.pathname;
      const isProtected = PROTECTED_ROUTES.some(
        (route) => path === route || path.startsWith(`${route}/`),
      );
      if (!isProtected) return true;
      return !!auth;
    },
  },
  pages: { signIn: '/login' },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export async function getCognitoIdToken(request: Request): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  const token = await getToken({
    req: request,
    secret,
  });
  return (token?.idToken as string | undefined) ?? null;
}
