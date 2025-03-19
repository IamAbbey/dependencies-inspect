import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/store";
import { DataTable } from "./data-table/table";
import { columnsDefinition } from "./data-table/column-def";

export function DependencyDashboard({
  className,
}: React.ComponentProps<"div">) {
  const data = useDashboardStore((state) => state.webUIData);

  return (
    <div
      className={cn(className)}
      style={{ height: "90vh", overflowY: "auto" }}
    >
      <div className={cn("p-4 flex flex-col", className)}>
        <p className="text-base">Dependency Dashboard</p>
        <DataTable data={data.packages} columns={columnsDefinition} />
      </div>
    </div>
  );
}
