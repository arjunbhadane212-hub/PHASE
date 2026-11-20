import { Toaster as Sonner, toast } from "sonner"

// UI v3 toasts — rounded blocks in the app palette. Base (neutral) colours are
// inline; type colours use !important classes so they win:
//   success / warning("earned") = lime · error = soft red block with dark-red
//   ink and a solid red icon (same look as the auth error banner).
const Toaster = ({ ...props }) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        style: {
          borderRadius: "16px",
          border: "none",
          fontFamily: "'Figtree', sans-serif",
          fontWeight: 600,
          boxShadow: "var(--gm-shadow-card)",
          padding: "12px 16px",
          background: "var(--gm-card)",
          color: "var(--gm-ink)",
        },
        classNames: {
          toast: "!rounded-[22px]",
          title: "!font-sans !font-semibold",
          description: "!text-[color:var(--gm-muted)]",
          success: "!bg-[#D4F36B] !text-[#2B3A06] [&_[data-icon]]:!text-[#2B3A06]",
          warning: "!bg-[#D4F36B] !text-[#2B3A06] [&_[data-icon]]:!text-[#2B3A06]",
          error: "!bg-[#FFDAD4] !text-[#6B0F0F] [&_[data-icon]]:!text-[#B91C1C] [&_[data-description]]:!text-[#6B0F0F] [&_[data-description]]:!opacity-80 [&_[data-title]]:!font-extrabold",
          actionButton: "!bg-[#2B3A06] !text-[#D4F36B] !rounded-full",
          cancelButton: "!bg-[color:var(--gm-badge)] !text-[color:var(--gm-muted)] !rounded-full",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
