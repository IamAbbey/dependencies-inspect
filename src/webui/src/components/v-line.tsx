import { cn } from "@/lib/utils";

export function VLine({
  label,
  body,
  className,
}: { label: string; body: string } & React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="opacity-70 font-semibold">{label}</p>
      <p className="whitespace-pre-line">{body}</p>
    </div>
  );
}
