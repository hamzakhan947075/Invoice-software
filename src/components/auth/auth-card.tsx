import Link from "next/link";
import { Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Link href="/" className="flex items-center gap-2 font-heading text-lg font-semibold">
        <Receipt className="h-6 w-6 text-primary" />
        InvoiceFlow
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer}
    </div>
  );
}
