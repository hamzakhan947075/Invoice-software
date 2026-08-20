"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Eye, Pencil, Printer, Send, Ban } from "lucide-react";
import { markInvoiceSentAction, cancelInvoiceAction } from "@/app/(app)/invoices/actions";
import { Button } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";
import type { InvoiceStatus } from "@/generated/prisma/enums";

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  status,
  balanceDue,
  currency,
}: {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  balanceDue: string;
  currency: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"sent" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkSent() {
    setPending("sent");
    setError(null);
    const result = await markInvoiceSentAction(invoiceId);
    if (result.error) {
      setError(result.error);
    } else {
      toast.success("Invoice marked as sent.");
      router.refresh();
    }
    setPending(null);
  }

  async function handleCancel() {
    setPending("cancel");
    setError(null);
    const result = await cancelInvoiceAction(invoiceId);
    if (result.error) {
      setError(result.error);
    } else {
      toast.success("Invoice cancelled.");
      router.refresh();
    }
    setPending(null);
  }

  const canRecordPayment = status === "SENT" || status === "PARTIALLY_PAID";
  const canCancel = status === "DRAFT" || status === "SENT" || status === "PARTIALLY_PAID";

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        {status === "DRAFT" && (
          <Button variant="outline" asChild>
            <Link href={`/invoices/${invoiceId}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <a href={`/invoices/${invoiceId}/pdf?disposition=inline`} target="_blank" rel="noopener noreferrer">
            <Eye className="h-4 w-4" />
            View PDF
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/invoices/${invoiceId}/pdf`} download={`${invoiceNumber}.pdf`}>
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
        {status === "DRAFT" && (
          <Button variant="outline" disabled={pending === "sent"} onClick={handleMarkSent}>
            <Send className="h-4 w-4" />
            {pending === "sent" ? "Marking…" : "Mark as Sent"}
          </Button>
        )}
        {canRecordPayment && (
          <RecordPaymentDialog invoiceId={invoiceId} balanceDue={balanceDue} currency={currency} />
        )}
        {status === "DRAFT" && (
          <DeleteInvoiceDialog invoiceId={invoiceId} invoiceNumber={invoiceNumber} />
        )}
        {canCancel && status !== "DRAFT" && (
          <Button variant="outline" disabled={pending === "cancel"} onClick={handleCancel}>
            <Ban className="h-4 w-4" />
            {pending === "cancel" ? "Cancelling…" : "Cancel Invoice"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
