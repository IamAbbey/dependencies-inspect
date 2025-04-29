import * as v from "valibot";
import { getUpdateType } from "./inspectUtils";
import { AllDependencies, Descriptor, Workspace } from "@yarnpkg/core";
export enum Group {
  MAIN = "main",
  DEV = "dev",
  PEER = "peer",
  DEPENDENCIES = "dependencies",
}

export type INSTALLED_STATUS = "installed" | "not-installed";
export type UPDATE_STATUS =
  | "up-to-date"
  | "semver-safe-update"
  | "update-possible";

const UrlSchema = v.pipe(
  v.string("A URL must be string."),
  v.url("The URL is badly formatted."),
);

export const NpmVulnerabilitiesSchema = v.object({
  cves: v.array(v.string()),
  title: v.string(),
  overview: v.nullish(v.string()),
  recommendation: v.nullish(v.string()),
  id: v.number(),
  url: UrlSchema,
  vulnerable_versions: v.string(),
  severity: v.string(),
});

export const PackageInfoSchema = v.pipe(
  v.object({
    name: v.string(),
    current_version: v.string(),
    latest_version: v.nullish(v.string()),
    installed_status: v.union([
      v.literal("installed"),
      v.literal("not-installed"),
    ]),
    // semver-safe-update -> It needs an immediate semver-compliant upgrade
    // update-possible -> It needs an upgrade but has potential BC breaks so is not urgent
    update_status: v.nullish(
      v.union([
        v.literal("up-to-date"),
        v.literal("semver-safe-update"),
        v.literal("update-possible"),
      ]),
    ),
    compatible: v.boolean(),
    group: v.string(),
    description: v.optional(v.string(), "No description available"),
    license: v.optional(v.string()),
    // a mapping of direct dependencies and their pretty constraints
    dependencies: v.record(v.string(), v.string()),
    required_by: v.array(v.string()),
    vulnerabilities: v.array(NpmVulnerabilitiesSchema),
  }),
  v.transform((input) => ({
    ...input,
    update_type: getUpdateType(input.current_version, input.latest_version),
  })),
);
export type PackageInfo = v.InferInput<typeof PackageInfoSchema>;

export const WebUIConfigSchema = v.object({
  show_latest: v.boolean(),
  show_all: v.optional(v.boolean(), false),
  package_manager: v.string(),
});

export const WebUIDataSchema = v.object({
  groups: v.array(v.string()),
  top_level_packages: v.array(v.string()),
  packages: v.array(PackageInfoSchema),
  config: WebUIConfigSchema,
});

export interface GroupedDescriptor {
  descriptor: Descriptor;
  workspace: Workspace;
  group: AllDependencies;
}
