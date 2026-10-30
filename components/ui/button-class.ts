export type ButtonVariant = "primary" | "accent" | "outline" | "ghost";

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: "md" | "sm" = "md",
  extra = "",
): string {
  return ["btn", `btn-${variant}`, size === "sm" ? "btn-sm" : "", extra]
    .filter(Boolean)
    .join(" ");
}
