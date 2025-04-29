import { cn } from "@/lib/utils";
import { Bullet } from "@/components/ui/bullet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VersionBadge } from "@/components/ui/version-badge";
import { useDashboardStore } from "@/lib/store";

type PackageNameVersion = {
  name: string;
  version: string;
};

export type Package = {
  name?: string;
  type: string;
  version: string;
  path: string;
  directDependenciesCount: number;
  requiredByDependenciesCount: number;
  dependsOn: PackageNameVersion[];
  otherVersions: PackageNameVersion[];
};

type PackageAnalysisProps = {} & React.ComponentProps<"div">;

export function PackageAnalysis({ className }: PackageAnalysisProps) {
  const selectedPackage = useDashboardStore((state) => state.selectedPackage);
  const showDashboard = useDashboardStore((state) => state.showDashboard);

  return (
    <div className={cn(className)}>
      <div className="border border-x-0 flex py-1 px-3 gap-2">
        <span>📊</span> <p>Package Analysis</p>
      </div>

      <div className="p-3">
        <div className="px-2 py-4 bg-primary-foreground rounded-md">
          {showDashboard ? (
            <div className="flex text-xs justify-center">
              No selected package
            </div>
          ) : selectedPackage ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <p className="font-semibold">{selectedPackage.name}</p>
                <div className="flex gap-1.5 items-center">
                  <Bullet className="bg-primary" />
                  <p className="text-xs font-light">{selectedPackage.group}</p>
                </div>
                <VersionBadge
                  className="text-primary/80 bg-secondary/80 p-1 mt-1 font-mono rounded"
                  version={
                    selectedPackage.current_version
                      ? `v${selectedPackage.current_version}`
                      : "-"
                  }
                />
              </div>

              <Separator className="my-1" />
              <div className="text-xs flex flex-wrap gap-2">
                <div className="grow border border-background/60 rounded-md dark:bg-background/60 p-2 flex flex-col gap-0.5">
                  <p className="text-xl font-bold">
                    {Object.keys(selectedPackage.dependencies).length}
                  </p>
                  <p className="font-light text-xs">Dependencies</p>
                  <Badge className="dark:bg-blue-200 bg-blue-400 rounded mt-1 p-0.5 font-medium text-[10px]">
                    Direct
                  </Badge>
                </div>
                <div className="grow border border-background/60 rounded-md dark:bg-background/60 p-2 flex flex-col gap-0.5">
                  <p className="text-xl font-bold">
                    {selectedPackage.required_by.length}
                  </p>
                  <p className="font-light text-xs">Required By</p>
                  <Badge className="dark:bg-purple-200 bg-purple-400 rounded mt-1 p-0.5 font-medium text-[10px]">
                    Dependents
                  </Badge>
                </div>
              </div>
              <div className="text-xs border border-background/60 rounded-md dark:bg-background/60 p-2 flex flex-col gap-2">
                <p className="font-light text-xs">Author</p>
                <div className="flex justify-between text-xs">
                  <p className="font-mono font-light">{"-"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex text-xs justify-center">
              No selected package
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
