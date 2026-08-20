import { FileClock, FileText, PiggyBank, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Total Invoiced", icon: FileText },
  { label: "Total Paid", icon: PiggyBank },
  { label: "Outstanding", icon: FileClock },
  { label: "Overdue", icon: TriangleAlert },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">0.00</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No invoices yet. They will appear here once invoicing is available.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
