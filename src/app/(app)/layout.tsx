import { requireCurrentUser } from "@/lib/auth/current-user";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();

  return (
    <AppShell businessName={user.business?.name ?? user.name}>
      {children}
    </AppShell>
  );
}
