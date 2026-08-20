"use client";

import { useActionState } from "react";
import { registerAction, type RegisterActionState } from "@/app/(auth)/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterActionState, FormData>(
    registerAction,
    undefined
  );

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="businessName">Business name</FieldLabel>
          <Input id="businessName" name="businessName" autoComplete="organization" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        {state?.error && <FieldError>{state.error}</FieldError>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}
