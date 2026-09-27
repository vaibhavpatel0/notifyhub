"use client";

/** Submit button that asks for confirmation first (used inside small server-action forms). */
export function ConfirmSubmit({ message, children, className = "btn-danger btn-sm" }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
