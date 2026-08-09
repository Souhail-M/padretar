import { cn } from "@/lib/utils";

/** The Dar as Saada wordmark: white serif small caps on black, per the logo. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("wordmark leading-none", className)}>Dar as Saada</span>
  );
}
