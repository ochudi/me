"use client";

// Confirm before firing a delete server action. Kept tiny and client-side so
// the rest of the editor can stay a server component.
export default function DeleteButton({
  action,
  label = "Delete",
}: {
  action: () => void;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Delete this permanently? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="border border-rule px-4 py-2 font-mono text-label uppercase text-muted transition-colors duration-200 hover:border-ink hover:text-ink focus-visible:outline-ink"
      >
        {label}
      </button>
    </form>
  );
}
