import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";

// Use a server-side env var for backend URL in API routes
const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  'http://localhost:3001/';

const MONGO_URI = process.env.MONGO_URI!;

// Reuse connection across warm invocations
let client: MongoClient | null = null;
async function getDb() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client.db(); // same default DB as /api/otp route
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "text" },
        otp:   { label: "OTP",   type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;
        try {
          const db    = await getDb();
          const otps  = db.collection('otps');
          const users = db.collection('users');

          // Find matching OTP record
          const record = await otps.findOne({
            email: credentials.email,
            otp:   credentials.otp,
          });
          if (!record) return null;

          // Check expiry
          if (record.expiresAt && record.expiresAt < new Date()) {
            await otps.deleteMany({ email: credentials.email });
            return null;
          }

          // Consume OTP
          await otps.deleteMany({ email: credentials.email });

          // Upsert user
          const derivedName = credentials.email.split('@')[0];
          const user = await users.findOneAndUpdate(
            { email: credentials.email },
            {
              $setOnInsert: { email: credentials.email, name: derivedName, authProvider: 'email' },
              $set: { isEmailVerified: true, lastSeenAt: new Date() },
            },
            { upsert: true, returnDocument: 'after' }
          );

          return {
            id:    user?._id?.toString() ?? credentials.email,
            email: credentials.email,
            name:  (user as any)?.name ?? derivedName,
          };
        } catch (e) {
          console.error('OTP verify failed:', e);
          return null;
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    error: '/',
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
