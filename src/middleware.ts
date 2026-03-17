import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (token?.companyStatus !== "active" && !path.startsWith("/pending") && !path.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/pending", req.url));
    }

    if (path.startsWith("/admin") && !token?.isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (path === "/dashboard" && token?.isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: [
    "/dashboard/:path*", "/customers/:path*", "/jobs/:path*", "/calls/:path*",
    "/calendar/:path*", "/quotes/:path*", "/invoices/:path*", "/costs/:path*",
    "/insurance/:path*", "/analytics/:path*", "/payroll/:path*",
    "/revenue-recovery/:path*", "/settings/:path*", "/team/:path*",
    "/flooring/:path*", "/admin/:path*", "/pending",
  ],
};
