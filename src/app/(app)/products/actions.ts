"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentBusiness } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";

export type ProductActionState = { error?: string; success?: boolean } | undefined;

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    description: formData.get("description"),
    type: formData.get("type"),
    price: formData.get("price"),
    taxRate: formData.get("taxRate"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const business = await requireCurrentBusiness();
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.product.create({
    data: {
      businessId: business.id,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      description: parsed.data.description || null,
      type: parsed.data.type,
      price: parsed.data.price.toFixed(2),
      taxRate: parsed.data.taxRate.toFixed(2),
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath("/products");
  return { success: true };
}

export async function updateProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const business = await requireCurrentBusiness();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing product id." };
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { count } = await prisma.product.updateMany({
    where: { id, businessId: business.id },
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      description: parsed.data.description || null,
      type: parsed.data.type,
      price: parsed.data.price.toFixed(2),
      taxRate: parsed.data.taxRate.toFixed(2),
      isActive: parsed.data.isActive,
    },
  });

  if (count === 0) {
    return { error: "Product not found." };
  }

  revalidatePath("/products");
  return { success: true };
}

export type DeleteProductActionState = { error?: string; success?: boolean } | undefined;

export async function deleteProductAction(
  _prevState: DeleteProductActionState,
  formData: FormData
): Promise<DeleteProductActionState> {
  const business = await requireCurrentBusiness();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing product id." };
  }

  // Past invoice items snapshot their own description/price/tax and only
  // reference the product loosely (onDelete: SetNull), so this is always safe.
  await prisma.product.deleteMany({ where: { id, businessId: business.id } });
  revalidatePath("/products");
  return { success: true };
}
