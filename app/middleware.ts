// middleware.ts (root of the repo)
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/player/:path*", "/parent/:path*", "/coach/:path*", "/admin/:path*"],
};
