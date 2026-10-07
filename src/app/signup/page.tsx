"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signup, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Fantasy rankings, start/sit advice, waiver picks, and roster tools for leagues you already play in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" name="displayName" placeholder="Troy" required />
              {state?.fieldErrors?.displayName && (
                <p className="text-xs text-danger">{state.fieldErrors.displayName[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
              {state?.fieldErrors?.email && (
                <p className="text-xs text-danger">{state.fieldErrors.email[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
              {state?.fieldErrors?.password && (
                <p className="text-xs text-danger">{state.fieldErrors.password[0]}</p>
              )}
            </div>
            {state?.error && <p className="text-sm text-danger">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating account..." : "Sign up"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
