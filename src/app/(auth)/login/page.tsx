import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Enter your details to access your account."
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
            Create one
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
