import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";

export const getCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: { business: true },
  });
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Every business-scoped Server Action / query should derive businessId from
 * here rather than trusting a client-submitted value (tenant isolation).
 */
export async function requireCurrentBusiness() {
  const user = await requireCurrentUser();
  if (!user.business) redirect("/login");
  return user.business;
}
