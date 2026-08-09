import { LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One punch, stated in words.
 *
 * The previous version used bare ↓ / ↑ arrows, which nobody could read at a
 * glance — an arrow does not say whether it means arriving or leaving. Entrée
 * and Sortie are written out, and the two are told apart by fill rather than
 * colour, so the black-and-white palette holds.
 */
export function PunchChip({
  type,
  time,
  className,
}: {
  type: "in" | "out";
  time: string;
  className?: string;
}) {
  const isIn = type === "in";
  const Icon = isIn ? LogIn : LogOut;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
        isIn
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="font-medium uppercase tracking-wide">
        {isIn ? "Entrée" : "Sortie"}
      </span>
      <span className="tnum">{time}</span>
    </span>
  );
}
