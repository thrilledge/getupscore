"use client";

import { useState, useCallback, useEffect } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

export default function SettingsPage() {
  const { user, loading } = useUser();
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? ""
  );
  const [savingName, setSavingName] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Preferences state
  const [prefs, setPrefs] = useState<UserPreferenceInsert | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // API Token state
  const [tokens, setTokens] = useState<ApiTokenData[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [showNewToken, setShowNewToken] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState("");
  const [newTokenName, setNewTokenName] = useState("");
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);

  // Load preferences on mount
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
      toast.error(result.error ?? "Failed to save preferences.");
    }
  }, [prefs]);

  // Load tokens on mount
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
      toast.error(result.error ?? "Failed to update name.");
      return;
    }

    toast.success("Display name updated.");
  }, [displayName]);

  const handlePasswordReset = useCallback(async () => {
    setSendingReset(true);
    const result = await sendPasswordReset();
    setSendingReset(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to send reset email.");
      return;
    }

    toast.success("Password reset email sent. Check your inbox.");
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
      toast.error(result.error ?? "Failed to generate token.");
      return;
    }

    setNewTokenValue(result.token ?? "");
    setShowNewToken(true);
    setTokenVisible(true);
    setNewTokenName("");
    await loadTokens();
  }, [newTokenName]);

  const handleRevokeToken = useCallback(async (tokenId: string) => {
    if (!confirm("Revoke this token? The extension using it will stop working.")) return;

    const result = await revokeApiToken(tokenId);
    if (!result.success) {
      toast.error(result.error ?? "Failed to revoke token.");
      return;
    }

    toast.success("Token revoked.");
    if (newTokenValue) {
      setShowNewToken(false);
      setNewTokenValue("");
    }
    await loadTokens();
  }, [newTokenValue]);

  const copyToken = useCallback(() => {
    if (newTokenValue) {
      navigator.clipboard.writeText(newTokenValue);
      toast.success("Token copied to clipboard.");
    }
  }, [newTokenValue]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, profile, and application preferences.
        </p>
      </div>

      {/* ─── Profile Section ─── */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-blue/10 p-2.5">
              <User className="size-5 text-accent-blue" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">Profile</CardTitle>
              <CardDescription>
                Your personal information and display name
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Mail className="size-4 text-muted-foreground" />
              Email Address
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={user?.email ?? ""}
                disabled
                className="bg-muted/50 text-muted-foreground"
              />
              <div className="shrink-0 rounded-full bg-accent-green/10 p-1.5">
                <CheckCircle2 className="size-4 text-accent-green" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your email is verified and used for sign-in and notifications.
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium">
              Display Name
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="flex-1"
                maxLength={100}
              />
              <Button
                onClick={handleSaveName}
                disabled={savingName || !displayName.trim()}
              >
                {savingName ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Save className="size-4 mr-2" />
                )}
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This is how your name appears across the app.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Preferences Section ─── */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-purple/10 p-2.5">
              <Palette className="size-5 text-accent-purple" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">
                Preferences
              </CardTitle>
              <CardDescription>
                Customize your app experience
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {prefsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !prefs ? (
            <p className="text-sm text-muted-foreground">Could not load preferences.</p>
          ) : (
            <>
              {/* Theme (visual only — no dark mode) */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="size-4 text-muted-foreground" />
                    Theme
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Light mode only (dark mode not available).
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Light
                </Button>
              </div>

              <Separator />

              {/* Timezone */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 shrink-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="size-4 text-muted-foreground" />
                    Timezone
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for scheduling and notifications.
                  </p>
                </div>
                <select
                  value={prefs.timezone}
                  onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                  className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm max-w-[220px]"
                >
                  {["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
                    "Europe/London", "Europe/Berlin", "Europe/Paris", "Europe/Moscow",
                    "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo",
                    "Australia/Sydney", "Pacific/Auckland",
                  ].map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              <Separator />

              {/* Notification Defaults */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Bell className="size-4 text-muted-foreground" />
                  Default Notification Settings
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  Choose which notifications you receive by default.
                </p>
                <div className="space-y-2 pt-1">
                  {[
                    { key: "notify_on_match", label: "New job matches" },
                    { key: "notify_on_proposal_status", label: "Proposal status changes" },
                    { key: "notify_on_contract_updates", label: "Contract updates" },
                    { key: "daily_digest", label: "Daily digest email" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border-border/60 accent-primary"
                        checked={(prefs as Record<string, unknown>)[key] === true}
                        onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={handleSavePrefs} disabled={savingPrefs}>
                  {savingPrefs ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="size-4 mr-2" />
                  )}
                  Save Preferences
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── API Tokens Section ─── */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-amber/10 p-2.5">
              <KeyRound className="size-5 text-accent-amber" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">
                Extension API Tokens
              </CardTitle>
              <CardDescription>
                Generate tokens to connect the UpScore Chrome Extension to your account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Generate new token */}
          <div className="space-y-3">
            <Label htmlFor="tokenName" className="text-sm font-medium">
              New Token
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="tokenName"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="Chrome Extension"
                className="flex-1"
                maxLength={50}
              />
              <Button
                onClick={handleGenerateToken}
                disabled={generatingToken}
              >
                {generatingToken ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="size-4 mr-2" />
                )}
                Generate
              </Button>
            </div>
          </div>

          {/* Show newly generated token */}
          {showNewToken && newTokenValue && (
            <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-5 text-accent-green shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-accent-green">
                    Token generated successfully!
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Copy this token now. You won&apos;t be able to see it again.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center gap-2">
                  <code className="flex-1 block bg-background border rounded-md p-3 text-xs font-mono break-all">
                    {tokenVisible
                      ? newTokenValue
                      : `${newTokenValue.slice(0, 16)}${"•".repeat(32)}`}
                  </code>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setTokenVisible(!tokenVisible)}
                      title={tokenVisible ? "Hide" : "Show"}
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
                      className="size-8"
                      onClick={copyToken}
                      title="Copy"
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Existing tokens */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Active Tokens</Label>

            {tokensLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-8">
                <KeyRound className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No API tokens yet. Generate one above for the Chrome Extension.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {token.name || "Chrome Extension"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {token.token_preview}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last used: {formatDate(token.last_used_at)} &middot;
                        Created: {formatDate(token.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRevokeToken(token.id)}
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

      {/* ─── Account Section ─── */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-destructive/10 p-2.5">
              <Shield className="size-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">Account</CardTitle>
              <CardDescription>
                Security and account management
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Password */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="size-4 text-muted-foreground" />
                Password
              </div>
              <p className="text-xs text-muted-foreground">
                Reset your password via email.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePasswordReset}
              disabled={sendingReset}
            >
              {sendingReset ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="size-4 mr-2" />
              )}
              Reset Password
            </Button>
          </div>

          <Separator />

          {/* Sign Out */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <LogOut className="size-4" />
                Sign Out
              </div>
              <p className="text-xs text-muted-foreground">
                Sign out of your account on this device.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="size-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
