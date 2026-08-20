"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentBusiness } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { invoiceSchema, type InvoiceInput } from "@/lib/validations/invoice";
import { calculateInvoiceTotals, calculateLineItem } from "@/lib/invoice-calculations";
import { generateInvoiceNumber } from "@/lib/invoice-number";

export type InvoiceActionResult = { error?: string; invoiceId?: string };

class InvoiceActionError extends Error {}

async function resolveItemProductIds(businessId: string, items: InvoiceInput["items"]) {
  const productIds = [...new Set(items.map((item) => item.productId).filter((id): id is string => Boolean(id)))];
  if (productIds.length === 0) return new Set<string>();

  const ownedProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, businessId },
    select: { id: true },
  });
  return new Set(ownedProducts.map((p) => p.id));
}

export async function createInvoiceAction(input: InvoiceInput): Promise<InvoiceActionResult> {
  const business = await requireCurrentBusiness();

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, businessId: business.id },
    select: { id: true },
  });
  if (!customer) {
    return { error: "Select a valid customer." };
  }

  // Only trust productId references that actually belong to this business.
  const ownedProductIds = await resolveItemProductIds(business.id, data.items);

  const totals = calculateInvoiceTotals(data.items);
  const issueDate = new Date(data.issueDate);

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(tx, business.id, issueDate);

    return tx.invoice.create({
      data: {
        businessId: business.id,
        customerId: data.customerId,
        invoiceNumber,
        issueDate,
        dueDate: new Date(data.dueDate),
        status: "DRAFT",
        currency: data.currency,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        amountPaid: 0,
        balanceDue: totals.total,
        notes: data.notes || null,
        items: {
          create: data.items.map((item) => {
            const { lineTotal } = calculateLineItem(item);
            return {
              productId: item.productId && ownedProductIds.has(item.productId) ? item.productId : null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxRate: item.taxRate,
              lineTotal,
            };
          }),
        },
      },
      select: { id: true },
    });
  });

  revalidatePath("/invoices");
  revalidatePath("/");
  return { invoiceId: invoice.id };
}

export async function updateInvoiceAction(
  invoiceId: string,
  input: InvoiceInput
): Promise<InvoiceActionResult> {
  const business = await requireCurrentBusiness();

  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId: business.id },
    select: { id: true, status: true },
  });
  if (!existing) return { error: "Invoice not found." };
  if (existing.status !== "DRAFT") {
    return { error: "Only draft invoices can be edited." };
  }

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, businessId: business.id },
    select: { id: true },
  });
  if (!customer) {
    return { error: "Select a valid customer." };
  }

  const ownedProductIds = await resolveItemProductIds(business.id, data.items);
  const totals = calculateInvoiceTotals(data.items);

  try {
    await prisma.$transaction(async (tx) => {
      // Re-verify DRAFT status and tenant ownership atomically with the write —
      // the earlier check above is only a fast-path UX guard, not the source of
      // truth, since the invoice could be marked Sent by another request in between.
      const { count } = await tx.invoice.updateMany({
        where: { id: invoiceId, businessId: business.id, status: "DRAFT" },
        data: {
          customerId: data.customerId,
          issueDate: new Date(data.issueDate),
          dueDate: new Date(data.dueDate),
          currency: data.currency,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          balanceDue: totals.total,
          notes: data.notes || null,
        },
      });
      if (count === 0) {
        throw new InvoiceActionError("Only draft invoices can be edited.");
      }

      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      await tx.invoiceItem.createMany({
        data: data.items.map((item) => {
          const { lineTotal } = calculateLineItem(item);
          return {
            invoiceId,
            productId: item.productId && ownedProductIds.has(item.productId) ? item.productId : null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            lineTotal,
          };
        }),
      });
    });
  } catch (error) {
    if (error instanceof InvoiceActionError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
  return { invoiceId };
}

export async function deleteDraftInvoiceAction(invoiceId: string): Promise<{ error?: string }> {
  const business = await requireCurrentBusiness();

  const { count } = await prisma.invoice.deleteMany({
    where: { id: invoiceId, businessId: business.id, status: "DRAFT" },
  });

  if (count === 0) {
    return { error: "Only draft invoices can be deleted." };
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  redirect("/invoices");
}

export async function markInvoiceSentAction(invoiceId: string): Promise<{ error?: string }> {
  const business = await requireCurrentBusiness();

  const { count } = await prisma.invoice.updateMany({
    where: { id: invoiceId, businessId: business.id, status: "DRAFT" },
    data: { status: "SENT" },
  });

  if (count === 0) {
    return { error: "Only draft invoices can be marked as sent." };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
  return {};
}

export async function cancelInvoiceAction(invoiceId: string): Promise<{ error?: string }> {
  const business = await requireCurrentBusiness();

  const { count } = await prisma.invoice.updateMany({
    where: {
      id: invoiceId,
      businessId: business.id,
      status: { in: ["DRAFT", "SENT", "PARTIALLY_PAID"] },
    },
    data: { status: "CANCELLED" },
  });

  if (count === 0) {
    return { error: "This invoice can't be cancelled." };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
  return {};
}
