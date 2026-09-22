"use client";

import {
  useState,
  useCallback,
  useEffect,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useTheme, type Theme } from "@/components/theme-provider";
import {
  updateDisplayName,
  sendPasswordReset,
  getPreferences,
  savePreferences,
} from "@/actions/settings";
import type { UserPreferenceInsert } from "@/lib/supabase/database-types";
import { DEFAULT_PROPOSAL_SYSTEM_PROMPT } from "@/lib/proposals/system-prompt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Shield,
  Bell,
  Loader2,
  Save,
  Key,
  LogOut,
  Mail,
  ExternalLink,
  CheckCircle2,
  Palette,
  Clock,
  Sparkles,
  RotateCcw,
  Settings,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const { user, loading } = useUser();
  const { theme, setTheme } = useTheme();

  // A stable identity for the signed-in user. `user` itself is a fresh object on
  // every auth event (token refresh, tab focus…), so effects must key on the id —
  // otherwise they re-run constantly and clobber unsaved edits (e.g. timezone).
  const userId = user?.id;

  const [displayName, setDisplayName] = useState("");

  const [savingName, setSavingName] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const [prefs, setPrefs] =
    useState<UserPreferenceInsert | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const [profileSynced, setProfileSynced] = useState(false);
  const [profileSyncLoading, setProfileSyncLoading] = useState(true);

  useEffect(() => {
    if (!loading || !userId) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    (async () => {
      try {
        const res = await fetch("/api/upwork-profile", {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setProfileSynced(!!data?.profile);
        }
      } catch {
        // ignore — sync state unknown
      } finally {
        clearTimeout(timer);
        if (!cancelled) setProfileSyncLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [loading, userId]);

  // Populate the display-name field once the user loads. Keyed on the id (not the
  // user object) so a background auth refresh doesn't overwrite what's being typed.
  useEffect(() => {
    if (!userId) return;
    const metadata = user?.user_metadata ?? {};
    setDisplayName(
      metadata.display_name ??
      metadata.full_name ??
      user?.email?.split("@")[0] ??
      ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!loading && userId) {
      loadPrefs();
    }
  }, [loading, userId]);

  async function loadPrefs() {
    setPrefsLoading(true);

    const result = await getPreferences();

    if (result.success && result.preferences) {
      setPrefs(result.preferences);
    }

    setPrefsLoading(false);
  }

  const handleSavePrefs = useCallback(async () => {
    if (!prefs) return;

    setSavingPrefs(true);

    const result = await savePreferences(prefs);

    setSavingPrefs(false);

    if (result.success) {
      toast.success("Preferences saved.");
    } else {
      toast.error(
        result.error ?? "Failed to save preferences."
      );
    }
  }, [prefs]);

  useEffect(() => {
    if (!prefsLoading && prefs) {
      setSystemPrompt(
        (prefs.proposal_system_prompt ?? "").trim() ||
        DEFAULT_PROPOSAL_SYSTEM_PROMPT
      );
    }
  }, [prefs, prefsLoading]);

  const handleSavePrompt = useCallback(async () => {
    setSavingPrompt(true);

    const value = systemPrompt.trim();

    const result = await savePreferences({
      proposal_system_prompt: value ? value : null,
    });

    setSavingPrompt(false);

    if (result.success) {
      setPrefs((currentPrefs) =>
        currentPrefs
          ? {
            ...currentPrefs,
            proposal_system_prompt: value
              ? value
              : null,
          }
          : currentPrefs
      );

      toast.success(
        value
          ? "AI proposal prompt saved."
          : "AI proposal prompt reset to default."
      );
    } else {
      toast.error(
        result.error ?? "Failed to save the prompt."
      );
    }
  }, [systemPrompt]);

  const handleResetPrompt = useCallback(() => {
    setSystemPrompt(DEFAULT_PROPOSAL_SYSTEM_PROMPT);
  }, []);

  const handleSaveName = useCallback(async () => {
    setSavingName(true);

    const result = await updateDisplayName(displayName);

    setSavingName(false);

    if (!result.success) {
      toast.error(
        result.error ?? "Failed to update name."
      );
      return;
    }

    toast.success("Display name updated.");
  }, [displayName]);

  const handlePasswordReset = useCallback(async () => {
    setSendingReset(true);

    const result = await sendPasswordReset();

    setSendingReset(false);

    if (!result.success) {
      toast.error(
        result.error ?? "Failed to send reset email."
      );
      return;
    }

    toast.success(
      "Password reset email sent. Check your inbox."
    );
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  if (loading) {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden rounded-[24px] border border-[#0A0A0A]/10 bg-[#EFF1F3] dark:border-white/10 dark:bg-[#0A0A0A]">
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/15 blur-[110px]" />

        <div className="relative z-10 flex flex-col items-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-[#00C98B]/25 bg-[#00C98B]/10">
            <Loader2 className="size-6 animate-spin text-[#00C98B]" />
          </span>

          <p className="mt-4 font-heading text-sm font-semibold text-[#0A0A0A] dark:text-white">
            Loading settings
          </p>

          <p className="mt-1 text-xs text-[#0A0A0A]/40 dark:text-white/35">
            Preparing your preferences...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-[#EFF1F3] px-5 py-6 text-[#0A0A0A] shadow-[0_12px_30px_rgba(0,0,0,0.06)] sm:px-6 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-white dark:shadow-[0_16px_40px_rgba(0,0,0,0.13)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "linear-gradient(to right, transparent, black)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black)",
          }}
        />

        <div className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full bg-[#00C98B]/15 blur-[100px]" />

        <div className="relative z-10 flex items-start gap-4">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B]">
            <Settings className="size-5" />

            <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-[#0A0A0A] bg-[#00C98B]" />
          </span>

          <div>
            {/* <div className="mb-1 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)]" />

              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00C98B]">
                Account configuration
              </span>
            </div> */}

            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Settings
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#0A0A0A]/55 dark:text-white/50">
              Manage your account, profile, application
              preferences and extension access.
            </p>
          </div>
        </div>
      </section>

      {/* Profile */}
      <Card className="gap-0 overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
        <div className="h-[3px] bg-[#00C98B]" />

        <CardHeader className="border-b border-[#0A0A0A]/10 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975]">
              <User className="size-5" />
            </span>

            <div>
              <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A]">
                Profile
              </CardTitle>

              <CardDescription className="mt-0.5 text-sm text-[#0A0A0A]/45">
                Your personal information and display name
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
              <Mail className="size-4 text-[#00A975]" />
              Email Address
            </Label>

            <div className="flex items-center gap-2">
              <Input
                value={user?.email ?? ""}
                disabled
                className="h-10 rounded-xl border-[#0A0A0A]/10 bg-[#F8F9F9] text-[#0A0A0A]/45"
              />

              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975]">
                <CheckCircle2 className="size-4" />
              </span>
            </div>

            <p className="text-xs text-[#0A0A0A]/40">
              Your email is verified and used for sign-in and
              notifications.
            </p>
          </div>

          <Separator className="bg-[#0A0A0A]/10" />

          <div className="space-y-2">
            <Label
              htmlFor="displayName"
              className="text-sm font-semibold text-[#0A0A0A]"
            >
              Display Name
            </Label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                placeholder="Your name"
                className="h-10 flex-1 rounded-xl border-[#0A0A0A]/10 bg-white focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20"
                maxLength={100}
              />

              <Button
                onClick={handleSaveName}
                disabled={
                  savingName || !displayName.trim()
                }
                className="h-10 rounded-xl bg-[#0A0A0A] px-4 font-semibold text-white hover:bg-[#0A0A0A]/90"
              >
                {savingName ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}

                Save
              </Button>
            </div>

            <p className="text-xs text-[#0A0A0A]/40">
              This is how your name appears across the app.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="gap-0 overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
        <CardHeader className="border-b border-[#0A0A0A]/10 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975]">
              <Palette className="size-5" />
            </span>

            <div>
              <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A]">
                Preferences
              </CardTitle>

              <CardDescription className="mt-0.5 text-sm text-[#0A0A0A]/45">
                Customize your application experience
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-5 py-5 sm:px-6">
          {prefsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-[#00A975]" />
            </div>
          ) : !prefs ? (
            <p className="rounded-xl border border-[#0A0A0A]/10 bg-[#F8F9F9] p-4 text-sm text-[#0A0A0A]/45">
              Could not load preferences.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
                    <Palette className="size-4 text-[#00A975]" />
                    Theme
                  </div>

                  <p className="text-xs text-[#0A0A0A]/40">
                    Choose light, dark, or match your system.
                  </p>
                </div>

                <div className="inline-flex shrink-0 rounded-xl border border-[#0A0A0A]/10 bg-[#F8F9F9] p-1">
                  {THEME_OPTIONS.map((option) => {
                    const active = theme === option.value;
                    const Icon = option.icon;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTheme(option.value)}
                        aria-pressed={active}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${active
                          ? "bg-white text-[#0A0A0A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                          : "text-[#0A0A0A]/45 hover:text-[#0A0A0A]"
                          }`}
                      >
                        <Icon className="size-3.5" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-[#0A0A0A]/10" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
                    <Clock className="size-4 text-[#00A975]" />
                    Timezone
                  </div>

                  <p className="text-xs text-[#0A0A0A]/40">
                    Used for scheduling and notifications.
                  </p>
                </div>

                <select
                  value={prefs.timezone}
                  onChange={(event) =>
                    setPrefs({
                      ...prefs,
                      timezone: event.target.value,
                    })
                  }
                  className="h-10 w-full rounded-xl border border-[#0A0A0A]/10 bg-white px-3 text-sm text-[#0A0A0A] outline-none transition-all focus:border-[#00C98B] focus:ring-2 focus:ring-[#00C98B]/20 sm:max-w-[240px]"
                >
                  {[
                    "UTC",
                    "America/New_York",
                    "America/Chicago",
                    "America/Denver",
                    "America/Los_Angeles",
                    "Europe/London",
                    "Europe/Berlin",
                    "Europe/Paris",
                    "Europe/Moscow",
                    "Asia/Dubai",
                    "Asia/Kolkata",
                    "Asia/Shanghai",
                    "Asia/Tokyo",
                    "Australia/Sydney",
                    "Pacific/Auckland",
                  ].map((timezone) => (
                    <option
                      key={timezone}
                      value={timezone}
                    >
                      {timezone.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <Separator className="bg-[#0A0A0A]/10" />

              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
                    <Bell className="size-4 text-[#00A975]" />
                    Default Notification Settings
                  </div>

                  <p className="mt-1 text-xs text-[#0A0A0A]/40">
                    Choose which notifications you receive by
                    default.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      key: "notify_on_match",
                      label: "New job matches",
                    },
                    {
                      key: "notify_on_proposal_status",
                      label: "Proposal status changes",
                    },
                    {
                      key: "notify_on_contract_updates",
                      label: "Contract updates",
                    },
                    {
                      key: "daily_digest",
                      label: "Daily digest email",
                    },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#0A0A0A]/10 bg-[#F8F9F9] px-3 py-3 transition-colors hover:border-[#00C98B]/30 hover:bg-[#00C98B]/5"
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-[#0A0A0A]/20 accent-[#00C98B]"
                        checked={
                          (
                            prefs as Record<
                              string,
                              unknown
                            >
                          )[key] === true
                        }
                        onChange={(event) =>
                          setPrefs({
                            ...prefs,
                            [key]: event.target.checked,
                          })
                        }
                      />

                      <span className="text-sm font-medium text-[#0A0A0A]/65">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSavePrefs}
                disabled={savingPrefs}
                className="h-10 rounded-xl bg-[#0A0A0A] px-4 font-semibold text-white hover:bg-[#0A0A0A]/90"
              >
                {savingPrefs ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}

                Save Preferences
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI proposal prompt */}
      <Card className="gap-0 overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
        <CardHeader className="border-b border-[#0A0A0A]/10 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975]">
              <Sparkles className="size-5" />
            </span>

            <div>
              <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A]">
                AI Proposal System Prompt
              </CardTitle>

              <CardDescription className="mt-0.5 text-sm text-[#0A0A0A]/45">
                Controls how AI writes your proposals
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-5 py-5 sm:px-6">
          <p className="rounded-xl border border-[#00C98B]/15 bg-[#00C98B]/5 p-3 text-xs leading-5 text-[#0A0A0A]/50">
            Edit the default 6-move methodology or replace it
            with your own instructions. Output formatting
            rules are appended automatically.
          </p>

          <textarea
            value={systemPrompt}
            onChange={(event) =>
              setSystemPrompt(event.target.value)
            }
            rows={16}
            className="w-full resize-y rounded-2xl border border-[#0A0A0A]/10 bg-[#F8F9F9] px-4 py-3 font-mono text-sm leading-6 text-[#0A0A0A]/70 outline-none transition-all focus:border-[#00C98B] focus:ring-2 focus:ring-[#00C98B]/20"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleResetPrompt}
              disabled={savingPrompt}
              title="Restore the default methodology"
              className="h-10 rounded-xl border-[#0A0A0A]/10 bg-white px-4 font-semibold text-[#0A0A0A] hover:border-[#00C98B]/30 hover:bg-[#00C98B]/5 hover:text-[#00A975]"
            >
              <RotateCcw className="size-4" />
              Reset to Default
            </Button>

            <Button
              onClick={handleSavePrompt}
              disabled={
                savingPrompt || !systemPrompt.trim()
              }
              className="h-10 rounded-xl bg-[#0A0A0A] px-4 font-semibold text-white hover:bg-[#0A0A0A]/90"
            >
              {savingPrompt ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}

              Save Prompt
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
        <CardHeader className="border-b border-[#0A0A0A]/10 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975]">
              <Shield className="size-5" />
            </span>

            <div>
              <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A]">
                Account
              </CardTitle>

              <CardDescription className="mt-0.5 text-sm text-[#0A0A0A]/45">
                Security and account management
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
                <Key className="size-4 text-[#00A975]" />
                Password
              </div>

              <p className="text-xs text-[#0A0A0A]/40">
                Reset your password through email.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePasswordReset}
              disabled={sendingReset}
              className="h-9 rounded-xl border-[#0A0A0A]/10 bg-white px-4 font-semibold text-[#0A0A0A] hover:border-[#00C98B]/30 hover:bg-[#00C98B]/5 hover:text-[#00A975]"
            >
              {sendingReset ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ExternalLink className="size-4" />
              )}

              Reset Password
            </Button>
          </div>

          <Separator className="bg-[#0A0A0A]/10" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
                <LogOut className="size-4 text-[#00A975]" />
                Sign Out
              </div>

              <p className="text-xs text-[#0A0A0A]/40">
                Sign out of your account on this device.
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleSignOut}
              className="h-9 rounded-xl bg-[#0A0A0A] px-4 font-semibold text-white hover:bg-[#0A0A0A]/90"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upwork Profile Sync (Extension) */}
      <Card className="gap-0 overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
        <div className="h-[3px] bg-[#00C98B]" />

        <CardHeader className="border-b border-[#0A0A0A]/10 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975]">
              {profileSyncLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : profileSynced ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <ExternalLink className="size-5" />
              )}
            </span>

            <div>
              <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A]">
                Upwork Profile Sync
              </CardTitle>

              <CardDescription className="mt-0.5 text-sm text-[#0A0A0A]/45">
                Your Upwork profile syncs automatically through the UpScore
                browser extension.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-5 py-5 sm:px-6">
          {profileSynced ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#00C98B]/20 bg-[#00C98B]/5 px-4 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#00C98B]/15 text-[#00A975]">
                <CheckCircle2 className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0A0A0A]">
                  Profile synced
                </p>

                <p className="text-xs text-[#0A0A0A]/45">
                  UpScore uses your synced profile for personalized job analysis
                  and chat.
                </p>
              </div>

              <span className="grid size-5 place-items-center rounded-full bg-[#00C98B] text-white">
                <CheckCircle2 className="size-3" />
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#0A0A0A]/10 bg-[#F8F9F9] px-4 py-3">
                <p className="text-sm font-semibold text-[#0A0A0A]">
                  No profile synced yet
                </p>

                <p className="mt-1 text-xs leading-5 text-[#0A0A0A]/45">
                  Install the UpScore browser extension and sign in to sync your
                  Upwork profile. Without it, UpScore shows generic analysis —
                  syncing unlocks profile-aware scores and chat.
                </p>
              </div>
            </div>
          )}

          <Separator className="bg-[#0A0A0A]/10" />

          {/* Proposal submission note */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
                <Sparkles className="size-4 text-[#00A975]" />
                AI Proposals — Always Drafts
              </div>

              <p className="mt-1 text-xs leading-5 text-[#0A0A0A]/45">
                When the AI writes a proposal in job chat, it&apos;s saved as a
                draft in your Proposals page — never submitted to Upwork
                automatically. Review and send it from the UpScore extension
                when you apply.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}