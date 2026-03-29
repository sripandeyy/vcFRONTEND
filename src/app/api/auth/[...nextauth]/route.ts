import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Use a server-side env var for backend URL in API routes
// BACKEND_URL is server-only; NEXT_PUBLIC_SOCKET_URL is a fallback
const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  'http://localhost:3001/';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "your@email.com" },
        otp: { label: "OTP", type: "text", placeholder: "123456" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;
        try {
          const res = await fetch(`${BACKEND}auth/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({ email: credentials.email, otp: credentials.otp }),
            headers: { "Content-Type": "application/json" }
          });
          const data = await res.json();
          if (data.success && data.user) {
            return { id: data.user.id, name: data.user.name, email: data.user.email };
          }
        } catch (e) {
          console.error('OTP verify failed:', e);
        }
        return null;
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    error: '/', // redirect errors back to home instead of showing server error page
  },
  callbacks: {
    async signIn({ user, account }) {
      // Persist Google users to our MongoDB database
      if (account?.provider === 'google' && user?.email) {
        try {
          await fetch(`${BACKEND}auth/google-upsert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
            }),
          });
        } catch (e) {
          // Non-fatal: user can still sign in even if upsert fails
          console.error('Failed to upsert Google user to DB:', e);
        }
      }
      return true;
    },

    async session({ session }) {
      return session;
    },
  },
});

export { handler as GET, handler as POST };
