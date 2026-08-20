"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentBusiness } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { paymentSchema, type PaymentInput } from "@/lib/validations/payment";
import { applyPayment } from "@/lib/invoice-calculations";

export type PaymentActionResult = { error?: string };

export async function recordPaymentAction(
  invoiceId: string,
  input: PaymentInput
): Promise<PaymentActionResult> {
  const business = await requireCurrentBusiness();

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId: business.id },
    select: { id: true, status: true, total: true, amountPaid: true, balanceDue: true },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
    return { error: "This invoice can't accept payments." };
  }

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const paymentAmount = new Prisma.Decimal(data.amount.toFixed(2));
  if (paymentAmount.greaterThan(invoice.balanceDue)) {
    return { error: "Payment amount can't exceed the remaining balance." };
  }

  const progress = applyPayment(invoice.total, invoice.amountPaid, paymentAmount);

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        businessId: business.id,
        invoiceId: invoice.id,
        amount: paymentAmount,
        paymentDate: new Date(data.paymentDate),
        paymentMethod: data.paymentMethod,
        reference: data.reference || null,
        notes: data.notes || null,
      },
    }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: progress.amountPaid,
        balanceDue: progress.balanceDue,
        status: progress.isPaidInFull ? "PAID" : "PARTIALLY_PAID",
      },
    }),
  ]);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/");
  return {};
}
