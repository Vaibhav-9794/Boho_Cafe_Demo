import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login pages — they must be accessible without auth
  if (pathname === '/owner-login' || pathname === '/manager-login' || pathname === '/staff-login') {
    return NextResponse.next();
  }

  // Only protect /owner/* and /manager/* dashboard routes
  const isOwnerRoute = pathname.startsWith('/owner');
  const isManagerRoute = pathname.startsWith('/manager');

  if (!isOwnerRoute && !isManagerRoute) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session — getUser() validates the JWT and refreshes if needed
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  console.log(`[Middleware] path=${pathname} user=${user?.id ?? 'NONE'} error=${userError?.message ?? 'none'}`);

  if (!user) {
    console.log(`[Middleware] No user found, redirecting to /staff-login`);
    const url = request.nextUrl.clone();
    url.pathname = '/staff-login';
    url.searchParams.set('error', 'unauthenticated');
    return NextResponse.redirect(url);
  }

  // Check staff profile using Supabase REST API with service role key
  const profileRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/staff_profiles?user_id=eq.${user.id}&select=role,status`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    }
  );

  const profiles = await profileRes.json();
  const profile = profiles?.[0];

  console.log(`[Middleware] profile=${JSON.stringify(profile)} for user=${user.id}`);

  if (!profile) {
    console.log(`[Middleware] No staff profile found, redirecting to /staff-login`);
    const url = request.nextUrl.clone();
    url.pathname = '/staff-login';
    url.searchParams.set('error', 'no_profile');
    return NextResponse.redirect(url);
  }

  // Check status
  if (profile.status === 'SUSPENDED') {
    const url = request.nextUrl.clone();
    url.pathname = '/staff-login';
    url.searchParams.set('error', 'suspended');
    return NextResponse.redirect(url);
  }

  if (profile.status === 'INACTIVE') {
    const url = request.nextUrl.clone();
    url.pathname = '/staff-login';
    url.searchParams.set('error', 'inactive');
    return NextResponse.redirect(url);
  }

  // Check role-based access — owner routes require OWNER role
  if (isOwnerRoute && profile.role !== 'OWNER') {
    const url = request.nextUrl.clone();
    url.pathname = '/manager';
    url.searchParams.set('error', 'access_denied');
    return NextResponse.redirect(url);
  }

  console.log(`[Middleware] ✅ Access granted: ${profile.role} → ${pathname}`);
  return response;
}

export const config = {
  matcher: ['/owner/:path*', '/manager/:path*'],
};
