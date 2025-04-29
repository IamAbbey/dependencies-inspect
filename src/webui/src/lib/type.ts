import * as v from "valibot";

const UrlSchema = v.pipe(
  v.string("A URL must be string."),
  v.url("The URL is badly formatted."),
);

export const PackageName = v.object({
  name: v.string(),
  version: v.optional(v.string(), " "),
});
export const PackageInfoSchema = v.pipe(
  v.object({
    name: v.string(),
    current_version: v.string(),
    latest_version: v.nullish(v.string()),
    group: v.string(),
    description: v.string(),
    dependencies: v.record(v.string(), v.string()),
    required_by: v.array(v.string()),
    update_type: v.string(),
    vulnerabilities: v.nullish(v.array(v.any())),
    // semver-safe-update -> It needs an immediate semver-compliant upgrade
    // update-possible -> It needs an upgrade but has potential BC breaks so is not urgent
    update_status: v.nullish(
      v.union([
        v.literal("up-to-date"),
        v.literal("semver-safe-update"),
        v.literal("update-possible"),
      ]),
    ),
  }),
);
export type PackageInfoSchemaType = v.InferInput<typeof PackageInfoSchema>;

const WebUIConfig = v.object({
  show_latest: v.boolean(),
  show_all: v.boolean(),
  package_manager: v.string(),
});

export type WebUIConfigType = v.InferInput<typeof WebUIConfig>;

export const WebUIDataSchema = v.pipe(
  v.object({
    groups: v.array(v.string()),
    top_level_packages: v.array(v.string()),
    packages: v.array(PackageInfoSchema),
    config: WebUIConfig,
  }),
  v.transform((input) => ({
    ...input,
    has_vulnerabilities: input.packages.some(
      (pkg) => pkg.vulnerabilities && pkg.vulnerabilities.length > 0,
    ),
  })),
);
export type WebUIDataSchemaType = v.InferOutput<typeof WebUIDataSchema>;

type JsonData =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonData }
  | JsonData[];
const JsonSchema: v.GenericSchema<JsonData> = v.lazy(() =>
  v.union([
    v.string(),
    v.number(),
    v.boolean(),
    v.null(),
    v.record(v.string(), JsonSchema),
    v.array(JsonSchema),
  ]),
);

export const PypiVulnerabilitiesData = v.object({
  aliases: v.array(v.string()),
  details: v.string(),
  summary: v.nullish(v.string()),
  fixed_in: v.array(v.string()),
  id: v.string(),
  link: UrlSchema,
  withdrawn: v.nullish(JsonSchema),
});

export const PypiJSONDataSchema = v.object({
  info: v.object({
    name: v.string(),
    summary: v.string(),
    project_url: UrlSchema,
    license: v.nullish(v.string()),
    author: v.nullish(v.string()),
  }),
  vulnerabilities: v.array(PypiVulnerabilitiesData),
});
export type PypiJSONDataSchemaType = v.InferInput<typeof PypiJSONDataSchema>;

export const NpmVulnerabilitiesDataSchema = v.object({
  cves: v.array(v.string()),
  title: v.string(),
  overview: v.nullish(v.string()),
  recommendation: v.nullish(v.string()),
  id: v.string(),
  url: UrlSchema,
  vulnerable_versions: v.string(),
  severity: v.string(),
});

export const NpmJSONDataSchema = v.object({
  vulnerabilities: v.array(NpmVulnerabilitiesDataSchema),
});
export type NpmVulnerabilitiesDataSchemaType = v.InferInput<
  typeof NpmVulnerabilitiesDataSchema
>;
export type NpmJSONDataSchemaType = v.InferInput<typeof NpmJSONDataSchema>;

export const TreeDataSchema = v.record(
  v.string(),
  v.object({
    index: v.string(),
    data: v.object({
      title: v.string(),
      group: v.string(),
      isTopLevel: v.boolean(),
    }),
    children: v.array(v.string()),
    isFolder: v.boolean(),
  }),
);

export type TreeDataSchemaType = v.InferInput<typeof TreeDataSchema>;

export interface IWindow {
  webUIData?: WebUIDataSchemaType;
}
