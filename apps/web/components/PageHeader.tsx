export default function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10">
      <h1 className="text-4xl font-bold">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-slate-400">{description}</p>}
    </div>
  );
}
