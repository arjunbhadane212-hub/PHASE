import { Toaster as Sonner, toast } from "sonner"

// v2 toasts — a small rounded rectangle following the cyan/lime rules.
// Base (neutral) colors are set via inline style; type-specific colors use
// !important classes so they override the inline base:
//   success = cyan, warning/"earned" = lime, error = destructive red.
const Toaster = ({ ...props }) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        style: {
          borderRadius: "16px",
          border: "none",
          fontFamily: "'General Sans', sans-serif",
          fontWeight: 600,
          boxShadow: "var(--gm-shadow-card)",
          padding: "12px 16px",
          background: "var(--gm-card)",
          color: "var(--gm-ink)",
        },
        classNames: {
          toast: "!rounded-2xl",
          title: "!font-['General_Sans',sans-serif] !font-semibold",
          description: "!text-[color:var(--gm-muted)]",
          success: "!bg-[#95DEE6] !text-[#183A3F] [&_[data-icon]]:!text-[#183A3F]",
          warning: "!bg-[#DBF67F] !text-[#2A3B0B] [&_[data-icon]]:!text-[#2A3B0B]",
          error: "!bg-[#B91C1C] !text-white [&_[data-icon]]:!text-white",
          actionButton: "!bg-[#183A3F] !text-[#95DEE6] !rounded-full",
          cancelButton: "!bg-[color:var(--gm-badge)] !text-[color:var(--gm-muted)] !rounded-full",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
