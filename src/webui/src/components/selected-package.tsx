import { cn, SUPPORTED_PACKAGE_MANAGER } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VersionBadge } from "@/components/ui/version-badge";
import { ChevronRight, ChevronLeft, TriangleAlert } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useDashboardStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PypiVulnerabilityList } from "./pypi-vulnerabilty";
import { NpmVulnerabilityList } from "./npm-vulnerabilty";

type SelectedPackageProps = {} & React.ComponentProps<"div">;

function InfoTab({ className }: SelectedPackageProps) {
  const selectedPackage = useDashboardStore((state) => state.selectedPackage!);
  const setSelectedPackage = useDashboardStore(
    (state) => state.setSelectedPackage!,
  );
  const getPackageByName = useDashboardStore((state) => state.getPackageByName);
  const packages = useDashboardStore((state) => state.webUIData.packages);
  const config = useDashboardStore((state) => state.webUIData.config);

  return (
    <div className={cn("flex flex-col gap-2 mb-5", className)}>
      <p>Package Information</p>
      <div className="flex flex-col gap-2 px-2 py-4 bg-primary-foreground rounded-md">
        <div className="text-xs grid grid-cols-2 gap-2">
          <div className="flex flex-col text-xs">
            <p className="opacity-70 font-light">Version</p>
            <VersionBadge
              className="bg-secondary/80"
              version={selectedPackage.current_version ?? "-"}
            />
          </div>
          <div className="flex flex-col text-xs gap-1">
            <p className="opacity-70 font-light">Latest Version</p>
            <Badge
              className={cn(
                selectedPackage.update_type == "Up-to-date"
                  ? "bg-green-500/20 text-green-500"
                  : "bg-red-500/20 text-red-500",
                "text-xs rounded font-mono",
              )}
            >
              <p className="text-xs">{selectedPackage.latest_version ?? "?"}</p>
              {selectedPackage.update_status === "update-possible" &&
                selectedPackage.latest_version && <p>(❗)</p>}
            </Badge>
          </div>
          <div className="flex flex-col text-xs">
            <p className="opacity-70 font-light">Group</p>
            <VersionBadge
              className="text-primary dark:bg-secondary/80 bg-transparent text-xs"
              version={`${selectedPackage.group}`}
            />
          </div>
          <div className="flex flex-col text-xs gap-1">
            <p className="opacity-70 font-light">Update Type</p>
            <p
              className={cn(
                selectedPackage.update_type == "Up-to-date"
                  ? "text-green-700"
                  : "text-red-700",
                "text-xs rounded font-semibold",
              )}
            >
              {selectedPackage.update_type}
            </p>
          </div>
        </div>

        <Separator className="mb-2 mt-4" />

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <p className="opacity-70 text-xs">Package Metrics</p>
          </div>
          <div className="flex flex-wrap gap-2 ">
            <div className="grow flex flex-col text-xs bg-secondary/80 rounded-md p-2 gap-1.5">
              <p className="opacity-70 font-light">Direct Dependencies</p>
              <p className="text-orange-400 font-semibold">
                {Object.keys(selectedPackage.dependencies).length} copies
              </p>
            </div>
            <div className="grow flex flex-col text-xs bg-secondary/80 rounded-md p-2 gap-1.5">
              <p className="opacity-70 font-light">Required By Dependencies</p>
              <p className="font-semibold">
                {selectedPackage.required_by.length}
              </p>
            </div>
            <div className="grow flex flex-col text-xs bg-secondary/80 rounded-md p-2 gap-1.5">
              <p className="opacity-70 font-light">License</p>
              <p className="font-semibold whitespace-pre-line">{"-"}</p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2">Why is this package installed?</p>
      <div className="text-xs flex flex-col gap-2 px-2 py-4 bg-primary-foreground rounded-md">
        <p>This is a transitive dependency required by:</p>
        {selectedPackage.required_by.length == 0 ? (
          <p>-</p>
        ) : (
          <div className="ml-6">
            <ul className="list-disc">
              {selectedPackage.required_by.map((value, index) => {
                const pkg = getPackageByName(value);
                return (
                  <li key={index} className="mb-1">
                    <span>{value}</span>
                    <span className="opacity-70">
                      {pkg ? `@${pkg.current_version}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-2">Direct dependencies of {selectedPackage.name}</p>

      <div className="mb-4 text-xs rounded-md bg-primary-foreground">
        {Object.keys(selectedPackage.dependencies).length == 0 ? (
          <p className="px-4 py-2">-</p>
        ) : (
          Object.keys(selectedPackage.dependencies).map(
            (dependency_name, index) => {
              return (
                <div
                  key={index}
                  className={cn(
                    index !=
                      Object.keys(selectedPackage.dependencies).length - 1
                      ? "border-b"
                      : "",
                    "flex items-center gap-2 w-full px-4 py-2 rounded-t-lg cursor-pointer",
                  )}
                  onClick={() => {
                    const pkg = packages.find((p) => p.name == dependency_name);
                    if (pkg) {
                      setSelectedPackage(pkg);
                    }
                  }}
                >
                  <div className="min-w-[70px]">
                    <VersionBadge
                      className="text-primary/80 bg-secondary/80 p-1 mt-1 font-mono rounded"
                      version={`${selectedPackage.dependencies[dependency_name]}`}
                    />
                  </div>
                  <p className="grow">{dependency_name}</p>
                  {config.show_all ? (
                    <div className="text-primary flex items-center gap-2">
                      <p>View</p>
                      <ChevronRight size={14} />
                    </div>
                  ) : null}
                </div>
              );
            },
          )
        )}
      </div>
    </div>
  );
}

function VulnerabilityTab() {
  const webUIConfig = useDashboardStore((state) => state.webUIData.config);

  if (webUIConfig.package_manager == SUPPORTED_PACKAGE_MANAGER.POETRY) {
    return <PypiVulnerabilityList />;
  } else if (webUIConfig.package_manager == SUPPORTED_PACKAGE_MANAGER.YARN) {
    return <NpmVulnerabilityList />;
  }
  return <></>;
}
export function SelectedPackage({ className }: SelectedPackageProps) {
  const selectedPackage = useDashboardStore((state) => state.selectedPackage);
  const setShowDashboard = useDashboardStore((state) => state.setShowDashboard);

  if (!selectedPackage) return <p>No selected package.</p>;

  return (
    <div className={cn("", className)}>
      <div className="p-3 flex justify-between items-center gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 items-center">
            <p className="text-base">{selectedPackage.name}</p>
            <VersionBadge version={selectedPackage.current_version ?? "-"} />
          </div>
          <div className="text-xs flex items-center gap-3">
            <p className="opacity-70 italic whitespace-pre-line">
              {selectedPackage.description}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowDashboard(true)}
          className="text-xs py-0 h-8 gap-1 px-3 rounded"
          size="sm"
          variant="outline"
        >
          <ChevronLeft size={10} /> <p className="text-xs">Dashboard</p>
        </Button>
      </div>

      <div className="">
        <Tabs defaultValue="Info" className="w-full">
          <TabsList className="items-center w-full justify-start rounded-none border border-x-0 bg-transparent p-0">
            <TabsTrigger
              value="Info"
              className="cursor-pointer text-xs relative h-9 rounded-none border-b-2 border-t-1 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Info
            </TabsTrigger>
            <TabsTrigger
              value="Vulnerability"
              className="cursor-pointer text-xs relative h-9 rounded-none border-b-2 border-t-1 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Vulnerabilities
              {Array.isArray(selectedPackage.vulnerabilities) &&
              selectedPackage.vulnerabilities.length >= 1 ? (
                <TriangleAlert
                  size={10}
                  className="text-orange-500 dark:text-orange-300 opacity-70"
                />
              ) : (
                <></>
              )}
            </TabsTrigger>
          </TabsList>
          <div style={{ height: "80vh", overflowY: "auto" }}>
            <TabsContent value="Info" className="px-4 py-2">
              <InfoTab />
            </TabsContent>
            <TabsContent value="Vulnerability" className="px-4 py-2">
              <VulnerabilityTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
