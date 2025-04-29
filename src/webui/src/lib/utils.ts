import { clsx, type ClassValue } from "clsx";
import useSWR from "swr";
import { parse } from "valibot";

import {
  PackageInfoSchemaType,
  PypiJSONDataSchema,
  PypiJSONDataSchemaType,
  NpmJSONDataSchemaType,
  WebUIConfigType,
} from "@/lib/type";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/*
200 variant of color, gotten(add) from https://tailwindcss.com/docs/colors
(use shift+click to copy hex value)
Reason: tailwind does not support dynamic class name yet!
*/
export const GROUP_COLORS = [
  { color: "green", value: "#16a34a" },
  { color: "blue", value: "#60a5fa" },
  { color: "yellow", value: "#ca8a04" },
  { color: "purple", value: "#9333ea" },
  { color: "orange", value: "#ea580c" },
  { color: "red", value: "#dc2626" },
  { color: "teal", value: "#0d9488" },
];

export const SUPPORTED_PACKAGE_MANAGER = {
  POETRY: "poetry",
  YARN: "yarn",
};

interface GenericVulnurabilityResponse {
  isLoading: boolean;
  error: unknown;
}

interface PypiResponse extends GenericVulnurabilityResponse {
  data: PypiJSONDataSchemaType | null;
}

interface NpmResponse extends GenericVulnurabilityResponse {
  data: NpmJSONDataSchemaType | null;
}

export function useSWRFetchPypiVulnerability(
  webUIConfig: WebUIConfigType,
  selectedPackage: PackageInfoSchemaType | null,
): PypiResponse {
  const { data, error, isLoading } = useSWR(
    selectedPackage &&
      selectedPackage.current_version &&
      webUIConfig.package_manager == SUPPORTED_PACKAGE_MANAGER.POETRY
      ? `https://pypi.org/pypi/${selectedPackage.name}/${selectedPackage.current_version}/json`
      : null,
    fetcher,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  let validatedData = null;
  if (data) {
    validatedData = parse(PypiJSONDataSchema, data);
  }

  return {
    data: validatedData,
    isLoading,
    error,
  };
}

export function useFetchPypiVulnerability(
  webUIConfig: WebUIConfigType,
  selectedPackage: PackageInfoSchemaType | null,
): PypiResponse {
  const vulnerabilities =
    webUIConfig.package_manager == SUPPORTED_PACKAGE_MANAGER.POETRY &&
    selectedPackage
      ? selectedPackage.vulnerabilities
        ? ({
            vulnerabilities: selectedPackage.vulnerabilities,
          } as PypiJSONDataSchemaType)
        : null
      : null;

  // maintain same structure as other package manager using SWR
  return {
    data: vulnerabilities,
    isLoading: false,
    error: null,
  };
}

export function useFetchNpmVulnerability(
  webUIConfig: WebUIConfigType,
  selectedPackage: PackageInfoSchemaType | null,
): NpmResponse {
  // we cannot get security audit with post from localhost
  // results to CORS error
  const vulnerabilities =
    webUIConfig.package_manager == SUPPORTED_PACKAGE_MANAGER.YARN &&
    selectedPackage
      ? selectedPackage.vulnerabilities
        ? ({
            vulnerabilities: selectedPackage.vulnerabilities,
          } as NpmJSONDataSchemaType)
        : null
      : null;

  // maintain same structure as other package manager using SWR
  return {
    data: vulnerabilities,
    isLoading: false,
    error: null,
  };
}
