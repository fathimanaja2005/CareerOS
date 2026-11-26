/** Amber note shown when a company name could not be verified online. */
export default function CompanyWarning({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div
      role="status"
      className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      {text}
    </div>
  );
}
