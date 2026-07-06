export default function ExecutionRestrictedNotice() {
  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6">
      <p className="text-sm font-semibold text-amber-400">Access Restricted</p>
      <p className="mt-2 text-sm text-slate-400">
        You do not have permission to execute this Digital Worker.
        <br />
        Please contact your administrator if access is required.
      </p>
    </div>
  );
}
