import { withAuth } from "next-auth/middleware";

const developmentSecret =
  process.env.NODE_ENV === "development" ? "nexusbase-local-development-secret" : undefined;

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET ?? developmentSecret,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => token?.role === "ADMIN",
  },
});

export const config = {
  matcher: ["/admin/:path*"],
};
