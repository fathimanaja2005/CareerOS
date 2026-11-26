/**
 * Renders text and highlights [placeholders] such as [N] or [X%] so the student
 * knows which numbers they still need to fill in themselves.
 */
export default function PlaceholderText({ text }: { text: string }) {
  // Split on bracketed groups, keeping the brackets in the output.
  const parts = text.split(/(\[[^\]\n]+\])/g);

  return (
    <>
      {parts.map((part, index) =>
        /^\[[^\]\n]+\]$/.test(part) ? (
          <mark
            key={index}
            className="rounded bg-amber-100 px-1 font-medium text-amber-800 ring-1 ring-amber-200"
            title="Replace this placeholder with your own number or detail"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}
