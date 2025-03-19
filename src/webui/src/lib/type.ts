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
  }),
);
export type PackageInfoSchemaType = v.InferInput<typeof PackageInfoSchema>;

export const WebUIDataSchema = v.object({
  groups: v.array(v.string()),
  top_level_packages: v.array(v.string()),
  packages: v.array(PackageInfoSchema),
  option: v.object({
    show_latest: v.boolean(),
  }),
});
export type WebUIDataSchemaType = v.InferInput<typeof WebUIDataSchema>;

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

export const PypiJSONData = v.object({
  info: v.object({
    name: v.string(),
    summary: v.string(),
    project_url: UrlSchema,
    license: v.nullish(v.string()),
    author: v.nullish(v.string()),
  }),
  vulnerabilities: v.array(PypiVulnerabilitiesData),
});

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
