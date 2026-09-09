"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  BrainCircuit,
  Check,
  Eye,
  EyeOff,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type LoginStep = "email" | "password";

const signInFeatures = [
  {
    icon: BrainCircuit,
    title: "AI opportunity scoring",
    description:
      "Instantly understand which jobs are worth your connects.",
  },
  {
    icon: BellRing,
    title: "Real-time job alerts",
    description:
      "Return to your filters and alerts exactly where you left them.",
  },
  {
    icon: Sparkles,
    title: "Your workspace is ready",
    description:
      "Sign in securely and continue working without starting over.",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [featureVisible, setFeatureVisible] = useState(true);

  const activeFeature = signInFeatures[activeFeatureIndex];
  const ActiveFeatureIcon = activeFeature.icon;

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow =
      document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow =
        previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    let swapTimeout: number | undefined;

    const interval = window.setInterval(() => {
      setFeatureVisible(false);

      swapTimeout = window.setTimeout(() => {
        setActiveFeatureIndex(
          (currentIndex) =>
            (currentIndex + 1) % signInFeatures.length
        );

        setFeatureVisible(true);
      }, 350);
    }, 2500);

    return () => {
      window.clearInterval(interval);

      if (swapTimeout) {
        window.clearTimeout(swapTimeout);
      }
    };
  }, []);

  function handleEmailContinue(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setStep("password");
  }

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    const { error: googleError } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

    if (googleError) {
      setError(googleError.message);
      setGoogleLoading(false);
    }
  }

  function handleBackToEmail() {
    setError(null);
    setStep("email");
  }

  function showFeature(index: number) {
    if (index === activeFeatureIndex) return;

    setFeatureVisible(false);

    window.setTimeout(() => {
      setActiveFeatureIndex(index);
      setFeatureVisible(true);
    }, 350);
  }

  return (
    <main className="fixed inset-0 z-[100] grid h-dvh w-screen max-w-none grid-cols-1 overflow-hidden overscroll-none bg-white lg:grid-cols-2">
      <style>
        {`
          @keyframes loginCardIn {
            from {
              opacity: 0;
              transform: translateY(24px);
              filter: blur(4px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0);
            }
          }

          @keyframes loginStepIn {
            from {
              opacity: 0;
              transform: translateX(16px);
            }

            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes rightContentIn {
            from {
              opacity: 0;
              transform: translateY(28px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes glowFloat {
            0%, 100% {
              transform: translate3d(0, 0, 0);
            }

            50% {
              transform: translate3d(28px, -18px, 0);
            }
          }

          .login-card-enter {
            animation: loginCardIn 650ms
              cubic-bezier(0.16, 1, 0.3, 1);
          }

          .login-step-enter {
            animation: loginStepIn 350ms
              cubic-bezier(0.16, 1, 0.3, 1);
          }

          .right-content-enter {
            animation: rightContentIn 750ms
              cubic-bezier(0.16, 1, 0.3, 1);
          }

          .login-glow {
            animation: glowFloat 10s ease-in-out infinite;
          }

          @media (max-height: 720px) {
            .login-card {
              transform: scale(0.9);
            }

            .right-login-content {
              transform: scale(0.9);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .login-card-enter,
            .login-step-enter,
            .right-content-enter,
            .login-glow {
              animation: none;
            }
          }
        `}
      </style>

      {/* Left side */}
      <section className="relative flex h-dvh min-h-0 min-w-0 items-center justify-center overflow-hidden bg-white px-4 py-4 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-0 size-[340px] rounded-full bg-[#00C98B]/10 blur-[115px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 right-0 size-[340px] rounded-full bg-[#00C98B]/10 blur-[115px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent)",
          }}
        />

        <Card className="login-card login-card-enter relative w-full max-w-[420px] overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 dark:bg-[#0A0A0A]/10 py-0 shadow-[0_22px_65px_rgba(0,0,0,0.1)] backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#00C98B]" />

          <CardHeader className="space-y-1 px-6 pb-4 pt-5 text-center sm:px-7 sm:pt-6">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-white/10 shadow-sm">
              <img
                src="/getupscore-logo-icon.png"
                alt={env.APP_NAME}
                width={40}
                height={40}
                className="size-10 object-contain"
              />
            </div>

            <CardTitle className="font-heading text-2xl font-bold tracking-tight text-[#0A0A0A]">
              Welcome back
            </CardTitle>

            <CardDescription className="text-sm text-[#0A0A0A]/55">
              {step === "email"
                ? "Sign in to continue to your workspace"
                : "Enter your password to securely continue"}
            </CardDescription>

            <div className="mx-auto mt-3 flex w-24 gap-2">
              <span className="h-1.5 flex-1 rounded-full bg-[#00C98B]" />

              <span
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step === "password"
                  ? "bg-[#00C98B]"
                  : "bg-[#0A0A0A]/10"
                  }`}
              />
            </div>
          </CardHeader>

          {step === "email" ? (
            <form
              key="email-step"
              onSubmit={handleEmailContinue}
              className="login-step-enter"
            >
              <CardContent className="space-y-3 px-6 sm:px-7">
                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-xl border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 px-3.5 py-2.5 text-sm text-[#0A0A0A]/75"
                  >
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-semibold text-[#0A0A0A]"
                  >
                    Email address
                  </Label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#0A0A0A]/40" />

                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      required
                      autoFocus
                      autoComplete="email"
                      className="h-11 rounded-xl border-[#0A0A0A]/15 bg-white pl-10 text-[#0A0A0A] placeholder:text-[#0A0A0A]/35 focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 px-6 pb-5 pt-4 sm:px-7 mt-4">
                <Button
                  type="submit"
                  disabled={googleLoading}
                  className="group h-11 w-full rounded-full bg-[#0A0A0A] font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0A0A0A]/90"
                >
                  Continue

                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>

                <div className="flex w-full items-center gap-3">
                  <span className="h-px flex-1 bg-[#0A0A0A]/10" />

                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#0A0A0A]/40">
                    or
                  </span>

                  <span className="h-px flex-1 bg-[#0A0A0A]/10" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                  className="h-11 w-full rounded-full border-[#0A0A0A]/15 bg-white font-semibold text-[#0A0A0A] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/50 hover:bg-[#00C98B]/5"
                >
                  {googleLoading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A]" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="size-5"
                      >
                        <path
                          fill="#4285F4"
                          d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.89h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z"
                        />

                        <path
                          fill="#34A853"
                          d="M12 22c2.7 0 4.98-.9 6.63-2.4l-3.24-2.52c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z"
                        />

                        <path
                          fill="#FBBC05"
                          d="M6.39 13.91A6 6 0 0 1 6.07 12c0-.66.11-1.3.32-1.91v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.51l3.35-2.6Z"
                        />

                        <path
                          fill="#EA4335"
                          d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.97 2.98 14.7 2 12 2a10 10 0 0 0-8.96 5.49l3.35 2.6C7.18 7.72 9.39 5.96 12 5.96Z"
                        />
                      </svg>

                      Continue with Google
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-[#0A0A0A]/55">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="font-heading font-semibold text-[#00A975] transition-colors hover:text-[#00C98B]"
                  >
                    Sign up
                  </Link>
                </p>
              </CardFooter>
            </form>
          ) : (
            <form
              key="password-step"
              onSubmit={handleLogin}
              className="login-step-enter"
            >
              <CardContent className="space-y-3 px-6 sm:px-7">
                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-xl border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 px-3.5 py-2.5 text-sm text-[#0A0A0A]/75"
                  >
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs text-[#0A0A0A]/45">
                      Signing in as
                    </p>

                    <p className="truncate text-sm font-semibold text-[#0A0A0A]">
                      {email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="ml-3 text-xs font-bold text-[#00A975] hover:text-[#00C98B]"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-[#0A0A0A]"
                  >
                    Password
                  </Label>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      required
                      autoFocus
                      autoComplete="current-password"
                      className="h-11 rounded-xl border-[#0A0A0A]/15 bg-white pr-11 text-[#0A0A0A] placeholder:text-[#0A0A0A]/35 focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#0A0A0A]/45 transition-colors hover:bg-[#00C98B]/10 hover:text-[#00A975]"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 px-6 pb-5 pt-4 sm:px-7">
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-full bg-[#00C98B] font-bold text-[#0A0A0A] shadow-[0_10px_28px_rgba(0,201,139,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00C98B]/90 disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-[#0A0A0A]/25 border-t-[#0A0A0A]" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="size-4" />
                      Sign In
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0A0A0A]/55 transition-colors hover:text-[#00A975]"
                >
                  <ArrowLeft className="size-4" />
                  Back to email
                </button>
              </CardFooter>
            </form>
          )}
        </Card>
      </section>

      {/* Right side — hidden on mobile */}
      <aside className="relative hidden h-dvh min-h-0 min-w-0 items-center overflow-hidden border-l border-white/10 bg-[#0A0A0A] lg:flex">
        <div
          aria-hidden="true"
          className="login-glow pointer-events-none absolute -right-44 -top-44 size-[520px] rounded-full bg-[#00C98B]/15 blur-[140px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-24 size-[500px] rounded-full bg-[#00C98B]/10 blur-[140px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
            backgroundSize: "54px 54px",
            maskImage:
              "radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)",
          }}
        />

        <div className="right-login-content right-content-enter relative mx-auto w-full max-w-[680px] px-12 py-10 xl:px-16 2xl:px-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/75 backdrop-blur-md">
            <ShieldCheck className="size-4 text-[#00C98B]" />
            Secure member access
          </div>

          <h2 className="max-w-[620px] font-heading text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-white xl:text-5xl">
            Welcome back to a{" "}
            <span className="text-[#00C98B]">
              smarter way to win work.
            </span>
          </h2>

          <p className="mt-5 max-w-[590px] text-base leading-7 text-white/55">
            Sign in to continue discovering relevant opportunities,
            reviewing AI match scores, and receiving alerts before the
            competition.
          </p>

          <div className="mt-9">
            <div
              className={`flex min-h-[132px] items-center gap-5 rounded-[24px] border border-[#00C98B]/30 bg-[#00C98B]/10 p-5 shadow-[0_20px_60px_rgba(0,201,139,0.08)] backdrop-blur-md transition-all duration-300 ease-in-out ${featureVisible
                ? "translate-y-0 scale-100 opacity-100 blur-0"
                : "translate-y-3 scale-[0.98] opacity-0 blur-[3px]"
                }`}
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[#00C98B]/20 bg-[#00C98B]/10 text-[#00C98B]">
                <ActiveFeatureIcon className="size-6" />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-lg font-bold text-white">
                  {activeFeature.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  {activeFeature.description}
                </p>
              </div>

              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#00C98B] text-[#0A0A0A]">
                <Check className="size-4 stroke-[3]" />
              </span>
            </div>

            <div className="mt-5 flex items-center gap-2">
              {signInFeatures.map((feature, index) => (
                <button
                  key={feature.title}
                  type="button"
                  aria-label={`Show ${feature.title}`}
                  onClick={() => showFeature(index)}
                  className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C98B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] ${activeFeatureIndex === index
                    ? "w-9 bg-[#00C98B]"
                    : "w-2 bg-white/20 hover:bg-white/40"
                    }`}
                />
              ))}

              <span className="ml-2 text-xs font-medium text-white/30">
                {String(activeFeatureIndex + 1).padStart(2, "0")} /{" "}
                {String(signInFeatures.length).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-40 motion-reduce:animate-none" />

              <span className="relative inline-flex size-2 rounded-full bg-[#00C98B]" />
            </span>

            <p className="text-xs font-medium text-white/40">
              Your account and credentials remain protected.
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
}