import { useEffect } from "react";
import { PackageAnalysis } from "./components/package-analysis";
import { Dependencies } from "./components/dependencies";
import { DependencyDashboard } from "./components/dashboard";
import { cn } from "./lib/utils";
import { useDashboardStore } from "./lib/store";
import { SelectedPackage } from "./components/selected-package";
import { Loader2, SearchCode } from "lucide-react";
import { ModeToggle } from "./components/ui/mode-toggle";

function App() {
  const fetchPackageInfo = useDashboardStore((state) => state.fetchPackageInfo);
  const showDashboard = useDashboardStore((state) => state.showDashboard);
  const showData = useDashboardStore((state) => state.showData);
  const option = useDashboardStore((state) => state.webUIData.option);

  useEffect(() => {
    fetchPackageInfo();
  }, [fetchPackageInfo]);

  return (
    <>
      <div
        className={cn(
          "flex justify-between items-center p-2",
          !showData && "border shadow border-x-0",
        )}
      >
        <div className="flex items-center gap-2">
          <SearchCode className="logo" />
          <h1 className="text-xl">Dependencies Inspect</h1>
        </div>
        <ModeToggle />
      </div>
      {!option.show_latest && (
        <div className="flex flex-wrap border italic border-b-0 bg-secondary justify-center text-xs p-1">
          <p>
            Use <span className="font-extrabold">poetry inspect --latest</span>{" "}
            to see latest version and available updates
          </p>
        </div>
      )}
      <div className="text-xs">
        {showData ? (
          <div className="text-xs flex" style={{ height: "100vh" }}>
            <Dependencies className="min-w-[350px] max-w-[400px]" />
            <div className={cn("grow border border-y-0")}>
              <div className="border border-x-0 flex py-1 px-3 gap-2">
                <span>📦</span> <p>Selected Package</p>
              </div>
              {showDashboard ? (
                <DependencyDashboard className="grow" />
              ) : (
                <SelectedPackage className="grow" />
              )}
            </div>

            <PackageAnalysis className="min-w-[300px] max-w-[400px]" />
          </div>
        ) : (
          <div className="mt-6 flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}

export default App;
