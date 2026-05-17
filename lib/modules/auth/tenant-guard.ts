import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";

// Simple helper to match string roles in Next.js
export type UserRole = Role;

export interface TenantContext {
  userId: string;
  role: Role;
  salonId: string | null;
}

export interface TenantValidationResult {
  error?: string;
  status?: number;
  context?: TenantContext;
}

/**
 * Validates the current user context, enforcing role-based permissions
 * and preventing any multi-tenant cross-salon data leaks.
 *
 * @param allowedRoles List of roles permitted to access this resource. If empty, all authenticated users are permitted.
 * @param checkSalonId Optional salonId to verify against. If provided, ensures the user belongs to this salon.
 */
export async function validateTenantContext(
  allowedRoles: Role[] = [],
  checkSalonId?: string | null
): Promise<TenantValidationResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized. Please sign in.", status: 401 };
  }

  // Hydrate user info from database to prevent token tempering
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, salonId: true },
  });

  if (!user) {
    return { error: "Unauthorized. User account not found.", status: 401 };
  }

  const role = user.role;

  // 1. Role-based access check
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return { error: "Forbidden. Insufficient permissions.", status: 403 };
  }

  // 2. Strict Tenant Isolation Check
  // Admins are platform owners and bypass tenant isolation rules
  if (role !== Role.ADMIN) {
    if (!user.salonId) {
      return { error: "Forbidden. User is not associated with any salon.", status: 403 };
    }

    if (checkSalonId && user.salonId !== checkSalonId) {
      return { error: "Forbidden. Cross-tenant data leak prevented.", status: 403 };
    }
  }

  // 3. Subscription Verification Check
  if (role !== Role.ADMIN && user.salonId) {
    const salon = await prisma.salon.findUnique({
      where: { id: user.salonId },
    });

    if (salon) {
      // Dynamic subscription check (we will extend this check when DB schema fields are active)
      const now = new Date();
      
      // Look up status in a safe string comparison format to avoid crashes before schema deployment
      const subscriptionStatus = (salon as any).subscriptionStatus;
      const subscriptionExpiresAt = (salon as any).subscriptionExpiresAt;

      const isExpired = 
        subscriptionStatus === "EXPIRED" || 
        (subscriptionExpiresAt && new Date(subscriptionExpiresAt) < now);

      if (isExpired && role !== Role.SALON_OWNER) {
        return {
          error: "Subscription Expired. Access is blocked until the salon owner renews the subscription.",
          status: 402, // Payment Required
        };
      }
    }
  }

  return {
    context: {
      userId: user.id,
      role: role,
      salonId: role === Role.ADMIN ? (checkSalonId || user.salonId) : user.salonId,
    },
  };
}
