import { Toaster as Sonner, toast } from "sonner"

// v2 toasts — a small rounded rectangle following the cyan/lime rules:
// success = cyan, "goal/earned" = lime (toast.success/`toast('…', {className})`),
// error = destructive red, everything else = the card token. General Sans, soft
// card shadow, no hard border.
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
        },
        classNames: {
          toast: "!rounded-2xl",
          title: "!font-['General_Sans',sans-serif] !font-semibold",
          description: "!text-[color:var(--gm-muted)] !font-['General_Sans',sans-serif]",
          default: "!bg-[color:var(--gm-card)] !text-[color:var(--gm-ink)]",
          info: "!bg-[color:var(--gm-card)] !text-[color:var(--gm-ink)]",
          success: "!bg-[#95DEE6] !text-[#183A3F]",
          warning: "!bg-[#DBF67F] !text-[#2A3B0B]",
          error: "!bg-[#B91C1C] !text-white",
          actionButton: "!bg-[#183A3F] !text-[#95DEE6] !rounded-full",
          cancelButton: "!bg-[color:var(--gm-badge)] !text-[color:var(--gm-muted)] !rounded-full",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
