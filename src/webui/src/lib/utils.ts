import { clsx, type ClassValue } from "clsx";
import useSWR from "swr";
import { parse } from "valibot";

import { PackageInfoSchemaType, PypiJSONData } from "@/lib/type";

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

export function usePypi(selectedPackage: PackageInfoSchemaType | null) {
  const { data, error, isLoading } = useSWR(
    selectedPackage && selectedPackage.current_version
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
    validatedData = parse(PypiJSONData, data);
  }

  return {
    pypiData: validatedData,
    isLoading,
    error,
  };
}
