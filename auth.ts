import { getServerSession, type NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { VerificationCodePurpose } from "@/app/generated/prisma/enums";
import {
  buildLoginVerificationIdentifier,
  isProfileCompleted,
  isGoogleAuthEnabled,
} from "@/lib/auth-flow";
import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/contact";
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/password";

const googleAuthEnabled = isGoogleAuthEnabled();

async function hydrateTokenFromDatabase(
  token: JWT,
  emailInput?: null | string,
): Promise<JWT> {
  const email = normalizeEmail(emailInput ?? token.email ?? "");

  if (!email) {
    return token;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
      id: true,
      name: true,
      phone: true,
      profileCompletedAt: true,
      role: true,
      salonId: true,
    },
  });

  if (!user) {
    return token;
  }

  token.email = user.email;
  token.id = user.id;
  token.name = user.name;
  token.phone = user.phone ?? null;
  token.profileCompleted = isProfileCompleted(user.profileCompletedAt);
  token.role = user.role;
  token.salonId = user.salonId ?? null;

  return token;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    ...(googleAuthEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
        verificationId: {
          label: "Verification Id",
          type: "text",
        },
      },
      async authorize(credentials) {
        const email = normalizeEmail(
          typeof credentials?.email === "string" ? credentials.email : "",
        );
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || password.length < 8) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          return null;
        }

        const passwordMatches = await verifyPassword(password, user.password);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          salonId: user.salonId,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = normalizeEmail(user.email);

      if (!email) {
        return false;
      }

      const fallbackName =
        typeof user.name === "string" && user.name.trim().length >= 2
          ? user.name.trim()
          : email.split("@")[0]?.trim() || "Processly User";
      const now = new Date();
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { googleId: account.providerAccountId }],
        },
        select: {
          id: true,
          name: true,
          profileCompletedAt: true,
        },
      });

      if (!existingUser) {
        await prisma.user.create({
          data: {
            email,
            emailVerifiedAt: now,
            googleId: account.providerAccountId,
            name: fallbackName,
            password: await hashPassword(generateTemporaryPassword()),
            role: email === "ttahaamal@gmail.com" ? "SALON_OWNER" : "CLIENT",
          },
        });

        return true;
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          emailVerifiedAt: now,
          googleId: account.providerAccountId,
          name:
            existingUser.name.trim().length >= 2
              ? existingUser.name
              : fallbackName,
          profileCompletedAt: existingUser.profileCompletedAt ?? null,
        },
      });

      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone ?? null;
        token.role = user.role;
        token.salonId = user.salonId ?? null;
      }

      if (user || account || !token.id || trigger === "update") {
        return hydrateTokenFromDatabase(token, user?.email);
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id =
          typeof token.id === "string" ? token.id : token.sub ?? "";
        session.user.phone =
          typeof token.phone === "string" ? token.phone : null;
        session.user.role = token.role || "CLIENT";
        session.user.salonId =
          typeof token.salonId === "string" ? token.salonId : null;
        session.user.profileCompleted = Boolean(token.profileCompleted);
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
