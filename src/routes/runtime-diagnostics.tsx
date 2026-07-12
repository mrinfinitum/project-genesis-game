import type { RuntimeContentState } from "@/lib/canonical-runtime";

export default function RuntimeDiagnostics({ state }: { state: RuntimeContentState }) {
  const issues = [...state.validationErrors, ...state.validationWarnings];

  return (
    <aside className="fixed bottom-3 right-3 z-50 w-[22rem] rounded-md border border-cyan-200/25 bg-slate-950/94 p-3 text-xs text-cyan-50 shadow-[0_18px_56px_rgba(0,0,0,0.42)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-black uppercase text-cyan-100/55">Runtime Diagnostics</div>
          <div className="mt-1 text-sm font-black text-white">{state.activeSource} / {state.status}</div>
        </div>
        <div className="rounded-md border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 font-black text-cyan-50">v{state.contentVersion}</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-md bg-white/[0.04] p-2">
          <div className="uppercase text-cyan-100/50">Eras</div>
          <div className="font-black text-white">{state.eras.length}</div>
        </div>
        <div className="rounded-md bg-white/[0.04] p-2">
          <div className="uppercase text-cyan-100/50">Resources</div>
          <div className="font-black text-white">{state.resources.length}</div>
        </div>
        <div className="rounded-md bg-white/[0.04] p-2">
          <div className="uppercase text-cyan-100/50">Upgrades</div>
          <div className="font-black text-white">{state.upgrades.length}</div>
        </div>
      </div>
      {issues.length ? (
        <div className="mt-3 max-h-36 overflow-auto rounded-md border border-amber-200/20 bg-amber-400/10 p-2 text-amber-50">
          {issues.map((issue) => (
            <div key={issue}>{issue}</div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
