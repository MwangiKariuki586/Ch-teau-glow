import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Skip processing for static files and API routes to improve performance
  const { pathname } = request.nextUrl;
  
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    // Only refresh auth token for admin routes to improve performance
    if (pathname.startsWith('/admin')) {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        // Not logged in -> Redirect to signin
        const url = request.nextUrl.clone();
        url.pathname = '/auth/signin';
        return NextResponse.redirect(url);
      }

      // Check if user has admin role via app_metadata (consistent with profile API)
      if (user.app_metadata?.role !== 'admin') {
        // Logged in but not an admin -> Redirect to home
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Supabase middleware error:', error);
    return supabaseResponse;
  }
}
