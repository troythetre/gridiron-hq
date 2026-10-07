import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request. Called from proxy.ts
 * (Next.js 16 renamed "Middleware" to "Proxy" - same mechanism, new file name).
 */
export async function updateSession(request: NextRequest) {
  // Create a NextResponse object to hold the response
  let supabaseResponse = NextResponse.next({ request });

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();  // Get all cookies from the request
        },
        // Set cookies on the response
        setAll(cookiesToSet) {
          // Set cookies on the request object for Supabase to read
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Set cookies on the response object for the client to read
          supabaseResponse = NextResponse.next({ request });
          // Set cookies on the response object for the client to read
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not add logic between createServerClient and getUser(). A simple
  // mistake here can make it very hard to debug issues with users being randomly logged out.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname; // Get the current request path
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup");
  const isProtectedRoute = path.startsWith("/dashboard");

  // Redirect unauthenticated users to the login page if they try to access a protected route
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) { // Redirect authenticated users away from the login/signup pages to the dashboard
    // Redirect authenticated users away from the login/signup pages to the dashboard
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
