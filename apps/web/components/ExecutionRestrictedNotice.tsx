export default function ExecutionRestrictedNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <p className="text-sm font-semibold text-amber-700">Access Restricted</p>
      <p className="mt-2 text-sm text-slate-500">
        You do not have permission to execute this Digital Worker.
        <br />
        Please contact your administrator if access is required.
      </p>
    </div>
  );
}
