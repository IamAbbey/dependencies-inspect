import * as React from "react";

import { cn } from "@/lib/utils";

export function Bullet({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("bg-foreground rounded-full h-2 w-2", className)}
      {...props}
    />
  );
}
