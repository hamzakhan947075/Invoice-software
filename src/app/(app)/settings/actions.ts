"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { requireCurrentBusiness } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { businessProfileSchema } from "@/lib/validations/business";

export type BusinessProfileActionState = { error?: string; success?: boolean } | undefined;

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function updateBusinessProfileAction(
  _prevState: BusinessProfileActionState,
  formData: FormData
): Promise<BusinessProfileActionState> {
  // businessId always comes from the session, never from client input.
  const business = await requireCurrentBusiness();

  const parsed = businessProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    currency: formData.get("currency"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let logoUrl = business.logoUrl;
  const logoFile = formData.get("logo");

  if (logoFile instanceof File && logoFile.size > 0) {
    if (!(logoFile.type in ALLOWED_LOGO_TYPES)) {
      return { error: "Logo must be a PNG, JPEG, or WEBP image." };
    }
    if (logoFile.size > MAX_LOGO_BYTES) {
      return { error: "Logo must be smaller than 2MB." };
    }

    const extension = ALLOWED_LOGO_TYPES[logoFile.type];
    const uploadDir = path.join(process.cwd(), "public", "uploads", "businesses", business.id);
    await mkdir(uploadDir, { recursive: true });

    const filename = `logo-${Date.now()}.${extension}`;
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    const previousLogoUrl = logoUrl;
    logoUrl = `/uploads/businesses/${business.id}/${filename}`;

    if (previousLogoUrl?.startsWith(`/uploads/businesses/${business.id}/`)) {
      await unlink(path.join(process.cwd(), "public", previousLogoUrl)).catch(() => {});
    }
  }

  await prisma.business.update({
    where: { id: business.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      currency: parsed.data.currency,
      logoUrl,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}
