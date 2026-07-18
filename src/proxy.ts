import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
    const isChangePasswordRoute = req.nextUrl.pathname.startsWith("/change-password");
    const role = req.nextauth.token?.role;
    const mustChangePassword = req.nextauth.token?.mustChangePassword;

    // A default/seeded password must be changed before anything else is
    // reachable — this is the enforcement point, not just a UI nudge.
    if (mustChangePassword && !isChangePasswordRoute) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    if (isAdminRoute && role !== "admin") {
      return NextResponse.redirect(new URL("/songs", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/songs/:path*",
    "/links/:path*",
    "/logistics/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/change-password/:path*",
  ],
};
