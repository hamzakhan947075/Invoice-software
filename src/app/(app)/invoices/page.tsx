import { FileText } from "lucide-react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function InvoicesPage() {
  return (
    <PagePlaceholder
      icon={FileText}
      title="Invoices"
      description="Invoice creation, editing, and PDF export land in a later development phase."
    />
  );
}
