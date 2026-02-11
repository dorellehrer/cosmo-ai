import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { FREE_MONTHLY_CREDITS } from "./stripe";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_INTEGRATION_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_INTEGRATION_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("No account found with this email");
        }

        if (!user.passwordHash) {
          throw new Error("This account uses social login. Please sign in with Google or GitHub.");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Handle OAuth sign-in
      if (account?.provider === "google" || account?.provider === "github") {
        if (!user.email) {
          return false;
        }

        // First, check if a user already has this provider linked
        const providerField = account.provider === "google" ? "googleId" : "githubId";
        const existingByProvider = await prisma.user.findFirst({
          where: { [providerField]: account.providerAccountId },
        });

        if (existingByProvider) {
          // Already linked — allow sign-in
          if (!existingByProvider.name && user.name) {
            await prisma.user.update({
              where: { id: existingByProvider.id },
              data: { name: user.name },
            });
          }
          return true;
        }

        // Check if user exists with this email
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          // Link the social account to existing user (safe: same email)
          const updateData: { googleId?: string; githubId?: string; name?: string } = {};
          
          if (account.provider === "google" && !existingUser.googleId) {
            updateData.googleId = account.providerAccountId;
          } else if (account.provider === "github" && !existingUser.githubId) {
            updateData.githubId = account.providerAccountId;
          }
          
          // Update name if not set
          if (!existingUser.name && user.name) {
            updateData.name = user.name;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: updateData,
            });
          }
        } else {
          // Create new user from OAuth — give free starter credits
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              passwordHash: null, // No password for OAuth users
              googleId: account.provider === "google" ? account.providerAccountId : null,
              githubId: account.provider === "github" ? account.providerAccountId : null,
              credits: FREE_MONTHLY_CREDITS,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For OAuth, we need to get the actual database user ID
        if (account?.provider === "google" || account?.provider === "github") {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });
          if (dbUser) {
            token.id = dbUser.id;
          }
        } else {
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
