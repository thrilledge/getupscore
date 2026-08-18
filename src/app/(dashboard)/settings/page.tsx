"use client";

import {
  useState,
  useCallback,
  useEffect,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import {
  updateDisplayName,
  sendPasswordReset,
  generateApiToken,
  revokeApiToken,
  getApiTokens,
  getPreferences,
  savePreferences,
  type ApiTokenData,
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
  Globe,
  Clock,
  Plus,
  Copy,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  Settings,
} from "lucide-react";

export default function SettingsPage() {
  const { user, loading } = useUser();

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name ??
    user?.email?.split("@")[0] ??
    ""
  );

  const [savingName, setSavingName] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const [prefs, setPrefs] =
    useState<UserPreferenceInsert | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const [tokens, setTokens] = useState<ApiTokenData[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [showNewToken, setShowNewToken] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState("");
  const [newTokenName, setNewTokenName] = useState("");
  const [generatingToken, setGeneratingToken] =
    useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      loadPrefs();
    }
  }, [loading, user]);

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

  useEffect(() => {
    if (!loading && user) {
      loadTokens();
    }
  }, [loading, user]);

  async function loadTokens() {
    setTokensLoading(true);

    const result = await getApiTokens();

    if (result.success && result.tokens) {
      setTokens(result.tokens);
    }

    setTokensLoading(false);
  }

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

  const handleGenerateToken = useCallback(async () => {
    setGeneratingToken(true);

    const result = await generateApiToken(newTokenName);

    setGeneratingToken(false);

    if (!result.success) {
      toast.error(
        result.error ?? "Failed to generate token."
      );
      return;
    }

    setNewTokenValue(result.token ?? "");
    setShowNewToken(true);
    setTokenVisible(true);
    setNewTokenName("");

    await loadTokens();
  }, [newTokenName]);

  const handleRevokeToken = useCallback(
    async (tokenId: string) => {
      if (
        !confirm(
          "Revoke this token? The extension using it will stop working."
        )
      ) {
        return;
      }

      const result = await revokeApiToken(tokenId);

      if (!result.success) {
        toast.error(
          result.error ?? "Failed to revoke token."
        );
        return;
      }

      toast.success("Token revoked.");

      if (newTokenValue) {
        setShowNewToken(false);
        setNewTokenValue("");
      }

      await loadTokens();
    },
    [newTokenValue]
  );

  const copyToken = useCallback(() => {
    if (newTokenValue) {
      navigator.clipboard.writeText(newTokenValue);
      toast.success("Token copied to clipboard.");
    }
  }, [newTokenValue]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";

    return new Date(dateString).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  if (loading) {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden rounded-[24px] bg-[#0A0A0A]">
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/15 blur-[110px]" />

        <div className="relative z-10 flex flex-col items-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-[#00C98B]/25 bg-[#00C98B]/10">
            <Loader2 className="size-6 animate-spin text-[#00C98B]" />
          </span>

          <p className="mt-4 font-heading text-sm font-semibold text-white">
            Loading settings
          </p>

          <p className="mt-1 text-xs text-white/35">
            Preparing your preferences...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0A0A0A] px-5 py-6 text-white shadow-[0_16px_40px_rgba(0,0,0,0.13)] sm:px-6">
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

            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
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
                    <Globe className="size-4 text-[#00A975]" />
                    Theme
                  </div>

                  <p className="text-xs text-[#0A0A0A]/40">
                    Light mode only. Dark mode is not
                    available.
                  </p>
                </div>

                <span className="inline-flex h-9 items-center rounded-xl border border-[#00C98B]/20 bg-[#00C98B]/10 px-4 text-xs font-semibold text-[#008F64]">
                  Light
                </span>
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

      {/* API Tokens */}
      <Card className="gap-0 overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
        <CardHeader className="border-b border-[#0A0A0A]/10 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975]">
              <KeyRound className="size-5" />
            </span>

            <div>
              <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A]">
                Extension API Tokens
              </CardTitle>

              <CardDescription className="mt-0.5 text-sm text-[#0A0A0A]/45">
                Connect the Chrome Extension to your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <Label
              htmlFor="tokenName"
              className="text-sm font-semibold text-[#0A0A0A]"
            >
              New Token
            </Label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="tokenName"
                value={newTokenName}
                onChange={(event) =>
                  setNewTokenName(event.target.value)
                }
                placeholder="Chrome Extension"
                className="h-10 flex-1 rounded-xl border-[#0A0A0A]/10 focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20"
                maxLength={50}
              />

              <Button
                onClick={handleGenerateToken}
                disabled={generatingToken}
                className="h-10 rounded-xl bg-[#0A0A0A] px-4 font-semibold text-white hover:bg-[#0A0A0A]/90"
              >
                {generatingToken ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}

                Generate
              </Button>
            </div>
          </div>

          {showNewToken && newTokenValue && (
            <div className="space-y-3 rounded-2xl border border-[#00C98B]/25 bg-[#00C98B]/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#00A975]" />

                <div>
                  <p className="text-sm font-semibold text-[#008F64]">
                    Token generated successfully
                  </p>

                  <p className="mt-1 text-xs text-[#0A0A0A]/45">
                    Copy this token now. You won&apos;t be
                    able to see it again.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <code className="block min-w-0 flex-1 break-all rounded-xl border border-[#0A0A0A]/10 bg-white p-3 font-mono text-xs text-[#0A0A0A]/65">
                  {tokenVisible
                    ? newTokenValue
                    : `${newTokenValue.slice(
                      0,
                      16
                    )}${"•".repeat(32)}`}
                </code>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-xl border-[#0A0A0A]/10 text-[#0A0A0A]/50 hover:border-[#00C98B]/30 hover:bg-[#00C98B]/5 hover:text-[#00A975]"
                    onClick={() =>
                      setTokenVisible(!tokenVisible)
                    }
                    title={
                      tokenVisible ? "Hide" : "Show"
                    }
                  >
                    {tokenVisible ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-xl border-[#0A0A0A]/10 text-[#0A0A0A]/50 hover:border-[#00C98B]/30 hover:bg-[#00C98B]/5 hover:text-[#00A975]"
                    onClick={copyToken}
                    title="Copy"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Separator className="bg-[#0A0A0A]/10" />

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-[#0A0A0A]">
              Active Tokens
            </Label>

            {tokensLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-[#00A975]" />
              </div>
            ) : tokens.length === 0 ? (
              <div className="rounded-2xl border border-[#0A0A0A]/10 bg-[#F8F9F9] px-4 py-8 text-center">
                <KeyRound className="mx-auto size-8 text-[#00A975]/50" />

                <p className="mx-auto mt-2 max-w-md text-sm text-[#0A0A0A]/45">
                  No API tokens yet. Generate one above for
                  the Chrome Extension.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#0A0A0A]/10 bg-[#F8F9F9] p-3 transition-all hover:border-[#00C98B]/30 hover:bg-[#00C98B]/5"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-[#0A0A0A]">
                        {token.name ||
                          "Chrome Extension"}
                      </p>

                      <p className="font-mono text-xs text-[#00A975]">
                        {token.token_preview}
                      </p>

                      <p className="text-[10px] leading-4 text-[#0A0A0A]/40">
                        Last used:{" "}
                        {formatDate(token.last_used_at)}
                        <span className="mx-1.5">•</span>
                        Created:{" "}
                        {formatDate(token.created_at)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 rounded-xl text-[#0A0A0A]/35 hover:bg-[#0A0A0A]/5 hover:text-[#0A0A0A]"
                      onClick={() =>
                        handleRevokeToken(token.id)
                      }
                      title="Revoke"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account */}
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
    </div>
  );
}