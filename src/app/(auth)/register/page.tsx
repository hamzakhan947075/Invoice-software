import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <AuthCard
      title="Create your account"
      description="Set up your business to start invoicing customers."
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
