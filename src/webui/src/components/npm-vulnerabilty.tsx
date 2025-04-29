import { useDashboardStore } from "@/lib/store";
import { useFetchNpmVulnerability } from "@/lib/utils";
import { VLine } from "./v-line";
import { ExternalLink } from "lucide-react";

export function NpmVulnerabilityList() {
  const webUIConfig = useDashboardStore((state) => state.webUIData.config);
  const selectedPackage = useDashboardStore((state) => state.selectedPackage!);
  const {
    data: npmData,
    error,
    isLoading,
  } = useFetchNpmVulnerability(webUIConfig, selectedPackage);

  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  return (
    <div className="flex flex-col gap-2 mb-5 text-xs">
      {npmData?.vulnerabilities.length == 0 ? (
        <p className="opacity-70">No security vulnerabilities found.</p>
      ) : (
        npmData?.vulnerabilities.map((vulnerability, index) => {
          return (
            <div
              key={index}
              className="px-2 py-4 bg-primary-foreground rounded-md flex gap-4 items-center"
            >
              <div className="grow flex flex-col gap-3">
                <VLine label="Summary" body={vulnerability.title} />
                {vulnerability.overview && (
                  <VLine label="Details" body={vulnerability.overview} />
                )}
                {vulnerability.recommendation && (
                  <VLine
                    label="Recommendation"
                    body={vulnerability.recommendation}
                  />
                )}
                <VLine label="Severity" body={vulnerability.severity} />
                <VLine
                  label="Vulnerable Versions"
                  body={vulnerability.vulnerable_versions}
                />
                <VLine label="CVEs" body={vulnerability.cves.join(", ")} />
              </div>
              <div>
                <a
                  href={vulnerability.url}
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
