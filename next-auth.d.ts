import type { DefaultSession } from "next-auth";
import type { Role } from "@/app/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      phone: string | null;
      profileCompleted: boolean;
      role: Role;
      salonId: string | null;
    };
  }

  interface User {
    id: string;
    phone?: string | null;
    profileCompleted?: boolean;
    role: Role;
    salonId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    phone?: string | null;
    profileCompleted?: boolean;
    role?: Role;
    salonId?: string | null;
  }
}
