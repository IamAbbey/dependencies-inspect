import { cn } from "@/lib/utils";
import { Badge } from "./badge";

type VersionBadgeProps = {
  version: string;
} & React.ComponentProps<"div">;

export function VersionBadge({ version, className }: VersionBadgeProps) {
  return (
    <Badge
      className={cn(
        "text-dark/70 bg-primary-foreground p-1 mt-1 font-mono rounded",
        className,
      )}
    >
      {version}
    </Badge>
  );
}
