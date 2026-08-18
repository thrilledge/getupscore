"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="border-border/50 shadow-xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center pb-6">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/10 shadow-sm">
          <img src="/getupscore-logo-icon.png" alt={env.APP_NAME} width={40} height={40} className="size-10 object-contain" />
        </div>
        <CardTitle className="text-2xl font-bold font-heading tracking-tight">{env.APP_NAME}</CardTitle>
        <CardDescription>Create a new account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className="h-10"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="size-4" />
                Create Account
              </span>
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-heading font-semibold text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
