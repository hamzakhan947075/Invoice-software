import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export function AppShell({
  children,
  businessName,
}: {
  children: React.ReactNode;
  businessName: string;
}) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader businessName={businessName} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
