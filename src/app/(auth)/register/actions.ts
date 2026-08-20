"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validations/auth";

export type RegisterActionState = { error: string } | undefined;

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const parsed = registerSchema.safeParse({
    businessName: formData.get("businessName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      business: {
        create: {
          name: parsed.data.businessName,
        },
      },
    },
  });

  await setSessionCookie(user.id);
  redirect("/");
}
