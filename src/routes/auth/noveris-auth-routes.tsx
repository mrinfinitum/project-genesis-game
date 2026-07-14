import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StoryCanvas } from "@/components/game-ui/genesis-ui";
import { loadCloudSyncMetadata, useNoverisAuth } from "@/lib/supabase";
import type { SaveSummary, StartupResult } from "@/lib/startup";

function NoverisFrame({ children }: { children: ReactNode }) {
  return (
    <StoryCanvas>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020813] text-cyan-50" data-safe-area-target="startup" style={{ padding: "max(24px, var(--safe-top)) max(24px, var(--safe-right)) max(24px, var(--safe-bottom)) max(24px, var(--safe-left))" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(38,208,255,0.22),transparent_34%),linear-gradient(180deg,rgba(2,8,19,0.2),rgba(2,8,19,0.92))]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[url('/roblox-assets/UI/hud_background_1920x1080.png')] bg-cover bg-center opacity-25" />
        <div className="relative w-full max-w-[62rem]">{children}</div>
      </div>
    </StoryCanvas>
  );
}

export function NoverisLoadingScreen({ startup }: { startup?: Pick<StartupResult, "phase" | "progress" | "message" | "recoverableError"> }) {
  const progress = startup?.progress ?? 16;
  return (
    <NoverisFrame>
      <div className="mx-auto max-w-[36rem] text-center">
        <div className="text-[0.78rem] font-black uppercase tracking-[0.72em] text-cyan-100/70">N O V E R I S</div>
        <div className="mt-3 text-4xl font-black uppercase text-white">The Future We Build</div>
        <div className="mt-8 overflow-hidden rounded-sm border border-cyan-100/30 bg-cyan-950/40 p-1 shadow-[0_0_36px_rgba(34,211,238,0.18)]">
          <div className="h-2 rounded-sm bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-200 transition-[width]" style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} />
        </div>
        <div className="mt-4 text-sm font-black uppercase text-cyan-100/75">{startup?.message ?? "Initializing"}</div>
        {startup?.recoverableError ? <div className="mt-2 text-xs font-bold text-amber-100/80">Continuing with local progress.</div> : null}
      </div>
    </NoverisFrame>
  );
}

function AuthPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <NoverisFrame>
      <div className="grid gap-8 lg:grid-cols-[1fr_28rem] lg:items-center">
        <div>
          <div className="text-[0.72rem] font-black uppercase tracking-[0.68em] text-cyan-100/70">N O V E R I S</div>
          <h1 className="mt-4 text-5xl font-black uppercase text-white">The Future We Build</h1>
          <p className="mt-4 max-w-[34rem] text-sm font-semibold leading-6 text-cyan-50/70">
            Continue locally as a guest or connect a cloud account when you want progress synced across devices.
          </p>
        </div>
        <section className="border border-cyan-200/22 bg-slate-950/78 p-5 shadow-[0_0_42px_rgba(34,211,238,0.14)]">
          <h2 className="text-xl font-black uppercase text-cyan-50">{title}</h2>
          {children}
        </section>
      </div>
    </NoverisFrame>
  );
}

function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" | "reset" }) {
  const auth = useNoverisAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "login") await auth.signIn(email, password);
    if (mode === "signup") await auth.signUp(email, password);
    if (mode === "forgot") {
      await auth.requestPasswordReset(email);
      setMessage("Reset link sent.");
      return;
    }
    if (mode === "reset") {
      await auth.updatePassword(password);
      setMessage("Password updated.");
      return;
    }
    navigate("/");
  }

  async function magicLink() {
    await auth.sendMagicLink(email);
    setMessage("Magic link sent.");
  }

  const unavailable = !auth.state.cloudAvailable;
  return (
    <form className="mt-5 space-y-3" onSubmit={(event) => void submit(event)}>
      {mode !== "reset" ? (
        <input className="w-full border border-cyan-100/20 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none focus:border-cyan-200" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      ) : null}
      {mode !== "forgot" ? (
        <input className="w-full border border-cyan-100/20 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none focus:border-cyan-200" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      ) : null}
      {auth.state.error || unavailable ? <div className="text-xs font-bold text-amber-100/85">{auth.state.error ?? auth.state.unavailableReason}</div> : null}
      {message ? <div className="text-xs font-bold text-cyan-100/85">{message}</div> : null}
      <button disabled={unavailable} className="w-full border border-cyan-200/40 bg-cyan-300/12 px-4 py-3 text-sm font-black uppercase text-cyan-50 disabled:opacity-45">
        {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : mode === "forgot" ? "Send Reset Link" : "Update Password"}
      </button>
      {mode === "login" ? (
        <button type="button" disabled={unavailable || !email} className="w-full border border-cyan-200/25 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase text-cyan-50 disabled:opacity-45" onClick={() => void magicLink()}>
          Send Magic Link
        </button>
      ) : null}
    </form>
  );
}

export function WelcomeRoute() {
  const auth = useNoverisAuth();
  const navigate = useNavigate();
  return (
    <AuthPanel title="Begin">
      <div className="mt-5 grid gap-3">
        <button className="border border-cyan-200/40 bg-cyan-300/12 px-4 py-3 text-sm font-black uppercase text-cyan-50" onClick={() => { auth.continueAsGuest(); navigate("/"); }}>
          Continue as Guest
        </button>
        <Link className="border border-cyan-200/25 bg-white/[0.04] px-4 py-3 text-center text-sm font-black uppercase text-cyan-50" to="/login">Sign In</Link>
        <Link className="border border-cyan-200/25 bg-white/[0.04] px-4 py-3 text-center text-sm font-black uppercase text-cyan-50" to="/signup">Create Account</Link>
      </div>
      <p className="mt-4 text-xs font-semibold leading-5 text-cyan-50/58">Guest mode stores progress on this device and works offline.</p>
    </AuthPanel>
  );
}

export function LoginRoute() {
  return <AuthPanel title="Sign In"><AuthForm mode="login" /><div className="mt-4 flex justify-between text-xs font-bold uppercase text-cyan-100/70"><Link to="/forgot-password">Forgot Password</Link><Link to="/welcome">Back</Link></div></AuthPanel>;
}

export function SignupRoute() {
  return <AuthPanel title="Create Account"><AuthForm mode="signup" /><div className="mt-4 text-xs font-bold uppercase text-cyan-100/70"><Link to="/welcome">Back</Link></div></AuthPanel>;
}

export function ForgotPasswordRoute() {
  return <AuthPanel title="Recover Account"><AuthForm mode="forgot" /><div className="mt-4 text-xs font-bold uppercase text-cyan-100/70"><Link to="/login">Back to Sign In</Link></div></AuthPanel>;
}

export function ResetPasswordRoute() {
  return <AuthPanel title="Reset Password"><AuthForm mode="reset" /></AuthPanel>;
}

function summaryRows(summary?: SaveSummary) {
  if (!summary) return ["No save summary available."];
  return [
    `Era: ${summary.currentEraId}`,
    `Labor: ${summary.labor}`,
    `Credits: ${summary.credits}`,
    `Population: ${summary.population}`,
    `Research: ${summary.research}`,
    `Last saved: ${summary.lastSaved}`,
    `Revision: ${summary.revision}`,
    `Save v${summary.saveVersion} / Content v${summary.contentVersion}`,
    summary.deviceName ? `Device: ${summary.deviceName}` : "Device: This browser"
  ];
}

export function SaveConflictRoute({
  startup,
  onUseCloud,
  onUseLocal,
  onRetry,
  onSignOut
}: {
  startup?: StartupResult;
  onUseCloud?: () => void;
  onUseLocal?: () => void;
  onRetry?: () => void;
  onSignOut?: () => void;
}) {
  return (
    <AuthPanel title="Save Conflict">
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {[
          { label: "Cloud Save", summary: startup?.cloudSummary },
          { label: "This Device", summary: startup?.localSummary }
        ].map(({ label, summary }) => (
          <div key={label} className="border border-cyan-100/16 bg-black/28 p-3">
            <div className="text-sm font-black uppercase text-cyan-50">{label}</div>
            <div className="mt-2 space-y-1 text-xs font-semibold leading-5 text-cyan-50/62">
              {summaryRows(summary).map((row) => <div key={row}>{row}</div>)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs font-bold uppercase text-amber-100/80">Comparison: {startup?.comparison ?? "divergent"}</div>
      <div className="mt-4 grid gap-2">
        <button className="border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black uppercase text-cyan-50 disabled:opacity-45" disabled={!onUseCloud || !startup?.cloudSummary} onClick={onUseCloud}>Use Cloud Save</button>
        <button className="border border-cyan-200/25 bg-white/[0.06] px-4 py-3 text-center text-sm font-black uppercase text-cyan-50 disabled:opacity-45" disabled={!onUseLocal || !startup?.localSummary} onClick={onUseLocal}>Use This Device</button>
        <button className="border border-cyan-200/25 bg-white/[0.04] px-4 py-3 text-center text-sm font-black uppercase text-cyan-50" onClick={onRetry}>Retry</button>
        <button className="border border-rose-200/25 bg-rose-300/10 px-4 py-3 text-center text-sm font-black uppercase text-rose-50" onClick={onSignOut}>Sign Out</button>
        <Link className="border border-cyan-200/20 bg-white/[0.04] px-4 py-3 text-center text-sm font-black uppercase text-cyan-50" to="/account">Account</Link>
      </div>
    </AuthPanel>
  );
}

export function AccountRoute() {
  const auth = useNoverisAuth();
  const navigate = useNavigate();
  const sync = loadCloudSyncMetadata();
  return (
    <AuthPanel title="Account">
      <div className="mt-5 grid gap-2 text-sm font-bold text-cyan-50/78">
        <div>Status: {auth.state.status === "guest" ? "Guest" : auth.state.status === "authenticated" ? "Signed In" : "Signed Out"}</div>
        <div>Email: {auth.state.email ?? "None"}</div>
        <div>Device: {sync.deviceName ?? "This browser"}</div>
        <div>Save Source: {sync.activeSaveSource}</div>
        <div>Cloud Sync: {auth.state.cloudAvailable ? "Available" : "Unavailable"}</div>
        <div>Sync Status: {sync.status}</div>
        <div>Cloud Revision: {sync.cloudRevision ?? "None"}</div>
        <div>Local Dirty: {sync.dirty ? "Yes" : "No"}</div>
        <div>Pending Retry: {sync.pendingRetry ? "Yes" : "No"}</div>
        <div>Last Sync: {sync.lastSuccessfulSyncAt ?? "Never"}</div>
        <div>Last Error: {sync.lastCloudError ?? "None"}</div>
      </div>
      <div className="mt-5 grid gap-2">
        {auth.state.status === "guest" ? <Link className="border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black uppercase text-cyan-50" to="/login">Save Progress to Cloud</Link> : null}
        {auth.state.status === "authenticated" ? <button className="border border-cyan-200/25 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase text-cyan-50" onClick={() => void auth.signOut().then(() => navigate("/welcome"))}>Sign Out</button> : null}
        <Link className="border border-cyan-200/20 bg-white/[0.04] px-4 py-3 text-center text-sm font-black uppercase text-cyan-50" to="/">Return to Game</Link>
      </div>
    </AuthPanel>
  );
}
