import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { isDevSkipAuth } from '@/lib/devMode';

function passThrough(_request: NextRequest) {
  return NextResponse.next();
}

export default isDevSkipAuth() ? passThrough : auth;

export const config = {
  matcher: ['/projects/:path*', '/planner/:path*'],
};
