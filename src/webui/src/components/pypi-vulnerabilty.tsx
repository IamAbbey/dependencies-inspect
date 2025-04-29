import { useDashboardStore } from "@/lib/store";
import { useFetchPypiVulnerability } from "@/lib/utils";
import { VLine } from "./v-line";
import { ExternalLink } from "lucide-react";

export function PypiVulnerabilityList() {
  const webUIConfig = useDashboardStore((state) => state.webUIData.config);
  const selectedPackage = useDashboardStore((state) => state.selectedPackage!);
  const {
    data: pypiData,
    error,
    isLoading,
  } = useFetchPypiVulnerability(webUIConfig, selectedPackage);

  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  return (
    <div className="flex flex-col gap-2 mb-5 text-xs">
      {pypiData?.vulnerabilities.length == 0 ? (
        <p className="opacity-70">No security vulnerabilities found.</p>
      ) : (
        pypiData?.vulnerabilities.map((vulnerability, index) => {
          return (
            <div
              key={index}
              className="px-2 py-4 bg-primary-foreground rounded-md flex gap-4 items-center"
            >
              <div className="grow flex flex-col gap-3">
                {vulnerability.summary && (
                  <VLine label="Summary" body={vulnerability.summary} />
                )}
                <VLine label="Details" body={vulnerability.details} />
                <VLine
                  label="Fixed in"
                  body={vulnerability.fixed_in.join(", ")}
                />
                <VLine
                  label="Aliases"
                  body={vulnerability.aliases.join(", ")}
                />
              </div>
              <div>
                <a
                  href={vulnerability.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
