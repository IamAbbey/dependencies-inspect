import {
  Configuration,
  MessageName,
  nodeUtils,
  Project,
  Descriptor,
  StreamReport,
  Report,
  Workspace,
  Cache,
  FetchOptions,
  ThrowReport,
  Manifest,
  formatUtils,
  DescriptorHash,
  AllDependencies,
  miscUtils,
} from "@yarnpkg/core";
import { Command, Option, UsageError } from "clipanion";
import { structUtils } from "@yarnpkg/core";
import { parse, array } from "valibot";
import { resolve, join, basename } from "path";
import { createInterface } from "readline";
import * as fs from "fs-extra";
import {
  PackageInfo,
  WebUIDataSchema,
  Group,
  WebUIConfigSchema,
  PackageInfoSchema,
  INSTALLED_STATUS,
  UPDATE_STATUS,
  GroupedDescriptor,
} from "../types";
import {
  getDependencyGroup,
  getPackageAudit,
  reverseDep,
  stdoutLink,
  storedPackageDescriptorMap,
  stringifyDescriptor,
  stripSpecifier,
} from "../inspectUtils";
import { valid as semverValid } from "semver";
import { CommandContext } from "@yarnpkg/core";
import { fetchDescriptorFrom } from "../suggestUtil";

const PACKAGE_MANAGER = "yarn";
const BASE_DIR = resolve(__dirname);
const DEFAULT_OUTPUT_DIR_NAME = "poetry_inspect_report";
const WEB_UI_BUILD_DIR = process.env.WEB_UI_BUILD_DIR
  ? process.env.WEB_UI_BUILD_DIR
  : join(BASE_DIR, "webui", "dist");

export class Inspector {
  constructor(
    public options: {
      showLatest: boolean;
      showVulnerability: boolean;
      showAll: boolean;
      silent: boolean;
      outputDir: string;
    },
  ) {}

  async createReport(
    packageInfo: PackageInfo[],
    topLevelDependencies: string[],
    projectCwd: string,
    configuration: Configuration,
    report: StreamReport,
  ) {
    const Mark = formatUtils.mark(configuration);
    const data = parse(WebUIDataSchema, {
      groups: Object.keys(Group).map((k) => k.toLowerCase()),
      top_level_packages: topLevelDependencies.sort(),
      packages: packageInfo,
      config: parse(WebUIConfigSchema, {
        show_latest: this.options.showLatest,
        package_manager: PACKAGE_MANAGER,
        show_all: this.options.showAll,
      }),
    });

    try {
      const cwdOutputDir = join(projectCwd, this.options.outputDir);
      const indexFile = join(cwdOutputDir, "index.html");

      // Remove the existing output directory (if it exists) and copy new files
      await fs.remove(cwdOutputDir);

      await fs.copy(WEB_UI_BUILD_DIR, cwdOutputDir, { overwrite: true });

      // Modify the index file
      const tempFile = indexFile + ".tmp";
      const readStream = fs.createReadStream(indexFile);
      const writeStream = fs.createWriteStream(tempFile);
      const rl = createInterface({ input: readStream });

      for await (const line of rl) {
        if (line.trim().includes("window.webUIData = undefined")) {
          writeStream.write(`window.webUIData = ${JSON.stringify(data)};\n`);
        } else {
          writeStream.write(line + "\n");
        }
      }

      rl.close();
      writeStream.end();

      // Replace original file with the modified file
      await fs.rename(tempFile, indexFile);

      const outputDirName = `${basename(cwdOutputDir)}/${basename(indexFile)}`;
      const indexFilePath = resolve(indexFile);
      report.reportInfo(
        null,
        `${Mark.Check} Wrote HTML report to ${stdoutLink(outputDirName, `file://${indexFilePath}`)}`,
      );
    } catch (error) {
      throw new UsageError(`Error generating report: ${error.message}`);
    }
  }

  async runner(
    project: Project,
    configuration: Configuration,
    report: StreamReport,
    workspace?: Workspace,
  ) {
    const Mark = formatUtils.mark(configuration);
    const cache = await Cache.find(configuration);

    const allDependencies = new Map<DescriptorHash, GroupedDescriptor>();

    for (const workspace of project.workspaces)
      for (const dependencyType of [
        `dependencies`,
        `devDependencies`,
        `peerDependencies`,
      ] as Array<AllDependencies>)
        for (const descriptor of workspace.manifest[dependencyType].values())
          if (project.tryWorkspaceByDescriptor(descriptor) === null)
            if (!descriptor.range.startsWith(`link:`))
              allDependencies.set(descriptor.descriptorHash, {
                descriptor: descriptor,
                group: dependencyType,
                workspace: workspace,
              } as GroupedDescriptor);

    const topLevelDescriptors: Record<string, Descriptor> = Array.from(
      allDependencies.values(),
    ).reduce(
      (result: Record<string, Descriptor> = {}, item: GroupedDescriptor) => {
        return {
          ...result,
          [structUtils.stringifyIdent(item.descriptor)]: item.descriptor,
        };
      },
      {},
    );
    const topLevelDependencies = Object.keys(topLevelDescriptors).sort();

    const directDependencies: Record<string, INSTALLED_STATUS> =
      topLevelDependencies.reduce(
        (result: Record<string, INSTALLED_STATUS> = {}, item: string) => {
          return { ...result, [item]: "not-installed" as INSTALLED_STATUS };
        },
        {},
      );
    const storedPackageDescriptors = storedPackageDescriptorMap(
      project,
      topLevelDescriptors,
    );

    const packages: PackageInfo[] = [];
    const processedPackages: string[] = [];
    await report.startTimerPromise(`Compilation step`, async () => {
      const iterStoredPackages = Array.from(
        project.storedPackages.values(),
      ).filter((pkg) => {
        const pkgIndentStringified = structUtils.stringifyIdent(pkg);
        return !(
          structUtils.isVirtualLocator(pkg) ||
          storedPackageDescriptors[pkg.identHash] === undefined ||
          (!this.options.showAll &&
            !topLevelDependencies.includes(pkgIndentStringified)) ||
          processedPackages.includes(pkgIndentStringified)
        );
      });
      const progress = Report.progressViaCounter(iterStoredPackages.length);
      await report.reportProgress(progress);
      const sortedIterStoredPackages = miscUtils.sortMap(
        [...iterStoredPackages],
        (pkg) => {
          return structUtils.stringifyIdent(pkg);
        },
      );
      for (const pkg of sortedIterStoredPackages) {
        const pkgIndentStringified = structUtils.stringifyIdent(pkg);
        if (!this.options.silent) {
          report.reportInfo(
            MessageName.UNNAMED,
            `${Mark.Question} Generating report for ${pkgIndentStringified}`,
          );
        }
        const currentVersion = pkg.version || "unknown";

        let latestVersion: string = null;
        let updateStatus: UPDATE_STATUS = null;
        let vulnerabilities = [];

        const fetcher = configuration.makeFetcher();
        const fetcherOptions: FetchOptions = {
          project,
          fetcher,
          cache,
          checksums: project.storedChecksums,
          report: new ThrowReport(),
          cacheOptions: { skipIntegrityCheck: true },
        };
        const fetchResult = await fetcher.fetch(pkg, fetcherOptions);

        let manifest;
        try {
          manifest = await Manifest.find(fetchResult.prefixPath, {
            baseFs: fetchResult.packageFs,
          });
        } finally {
          fetchResult.releaseFs?.();
        }

        if (
          this.options.showAll ||
          topLevelDependencies.includes(pkgIndentStringified)
        ) {
          try {
            if (this.options.showLatest) {
              const fetchUpdatedDescriptor = async (
                workspace: Workspace,
                descriptor: Descriptor,
                copyStyle: string,
                range: string,
              ) => {
                const candidate = await fetchDescriptorFrom(descriptor, range, {
                  project,
                  cache,
                  preserveModifier: copyStyle,
                  workspace,
                });

                if (candidate !== null) {
                  return candidate.range;
                } else {
                  return descriptor.range;
                }
              };

              const fetchSuggestions = async (descriptor: Descriptor) => {
                if (!this.options.silent) {
                  report.reportInfo(
                    MessageName.UNNAMED,
                    `   ↳ Fetching latest version...`,
                  );
                }

                const referenceRange = semverValid(descriptor.range)
                  ? `^${descriptor.range}`
                  : descriptor.range;
                const _workspace = allDependencies.get(
                  descriptor.descriptorHash,
                )
                  ? allDependencies.get(descriptor.descriptorHash).workspace
                  : workspace;
                const [resolution, latest] = await Promise.all([
                  fetchUpdatedDescriptor(
                    _workspace,
                    descriptor,
                    descriptor.range,
                    referenceRange,
                  ).catch(() => null),
                  fetchUpdatedDescriptor(
                    _workspace,
                    descriptor,
                    descriptor.range,
                    `latest`,
                  ).catch(() => null),
                ]);

                const resolutionRangeSelector =
                  structUtils.tryParseRange(resolution);
                const latestRangeSelector = structUtils.tryParseRange(latest);
                const descriptorRangeSelector = structUtils.tryParseRange(
                  descriptor.range,
                );
                if (
                  resolutionRangeSelector &&
                  resolutionRangeSelector.selector !==
                    descriptorRangeSelector.selector
                ) {
                  latestVersion = resolutionRangeSelector.selector;
                  updateStatus = "semver-safe-update";
                } else if (
                  resolutionRangeSelector &&
                  resolutionRangeSelector.selector ===
                    descriptorRangeSelector.selector
                ) {
                  latestVersion = currentVersion;
                  updateStatus = "up-to-date";
                }

                if (
                  latestRangeSelector &&
                  latestRangeSelector.selector !==
                    resolutionRangeSelector.selector &&
                  latestRangeSelector.selector !==
                    descriptorRangeSelector.selector
                ) {
                  latestVersion = latestRangeSelector.selector;
                  updateStatus = "update-possible";
                }
              };
              await fetchSuggestions(storedPackageDescriptors[pkg.identHash]);
            }
            if (this.options.showVulnerability) {
              if (!this.options.silent) {
                report.reportInfo(
                  MessageName.UNNAMED,
                  `   ↳ Fetching vulnerability report ...`,
                );
              }
              const auditData = await getPackageAudit(
                pkgIndentStringified,
                currentVersion,
              )
                .then((r) => r.json())
                .catch(() => {}); // Handle error gracefully
              if (auditData) {
                vulnerabilities = Object.values(auditData["advisories"]);
              }
            }
          } catch (error) {
            // TODO: do something with error
            throw new Error(`Something went wrong!!, ${error}`);
          }
        }

        const dependencies = [
          ...new Set(
            [...pkg.dependencies.values()]
              .filter((dep) => !structUtils.isVirtualDescriptor(dep))
              .map((dep) => stringifyDescriptor(dep)),
          ),
        ];

        if (Object.keys(directDependencies).includes(pkgIndentStringified)) {
          directDependencies[pkgIndentStringified] = "installed";
        }

        processedPackages.push(pkgIndentStringified);
        packages.push({
          name: pkgIndentStringified,
          current_version: stripSpecifier(currentVersion),
          latest_version: stripSpecifier(latestVersion),
          update_status: updateStatus,
          description: manifest.raw.description,
          license: manifest.raw.license,
          installed_status:
            directDependencies[pkgIndentStringified] ?? "installed", // if not in the top level dependencies, then installed as transitive
          compatible: structUtils.isPackageCompatible(
            pkg,
            nodeUtils.getArchitectureSet(),
          ),
          group: getDependencyGroup(
            allDependencies,
            storedPackageDescriptors[pkg.identHash],
          ),
          dependencies: dependencies.reduce(
            (result: Record<string, string> = {}, item: string[]) => {
              const [name, range] = item;
              return { ...result, [name]: range };
            },
            {},
          ),
          required_by: this.options.showAll
            ? Object.keys(reverseDep(pkg, project))
            : [], // since without --all, we only show the top level dependencies
          vulnerabilities: vulnerabilities,
        });
        progress.tick();
      }
    });
    return { packages, topLevelDependencies };
  }
}

export default class InspectCommand extends Command<CommandContext> {
  static paths = [[`inspect`]];

  static usage = Command.Usage({
    description: `Generates HTML report for installed packages with version, latest version, description, and reasons for installation.`,
    details: `
      This command retrieves information about installed packages in your project.
      It displays the package name, current version, latest available version, a brief description, and the packages that depend on it (why it's installed).

      The 'why' information might not be perfect due to various resolution strategies, but it offers insights into dependency chains.
    `,
    examples: [
      [
        `yarn inspect`,
        `Generates HTML report information for all installed packages`,
      ],
    ],
  });

  show_latest = Option.Boolean(`-l,--latest`, false, {
    description: `Show the latest version, by default, only applies on the direct dependencies from the current workspace.
    To get latest report on the whole project, use the --all flags.`,
  });

  show_vulnerability = Option.Boolean(`-x,--vulnerability`, false, {
    description: `Audit packages and report any vulnerabilities, by default, only applies on the direct dependencies from the current workspace.
    To get vulnerability report on the whole project, use the --all flags.`,
  });

  all = Option.Boolean(`-a,--all`, false, {
    description: `to apply the inspect options on all packages, including transitive dependencies`,
  });

  silent = Option.Boolean(`-s,--silent`, false, {
    description: `Silent report logs`,
  });

  output = Option.String("-o,--output", DEFAULT_OUTPUT_DIR_NAME, {
    description: `The name of the output folder.`,
  });

  async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins,
    );
    const { project, workspace } = await Project.find(
      configuration,
      this.context.cwd,
    );

    await project.restoreInstallState();

    const inspectReport = await StreamReport.start(
      {
        configuration,
        stdout: this.context.stdout,
      },
      async (report) => {
        report.reportInfo(MessageName.UNNAMED, "Generating report...");
        const inspector = new Inspector({
          showLatest: this.show_latest,
          showVulnerability: this.show_vulnerability,
          showAll: this.all,
          silent: this.silent,
          outputDir: this.output,
        });
        const { packages, topLevelDependencies } = await inspector.runner(
          project,
          configuration,
          report,
          workspace,
        );

        inspector.createReport(
          parse(array(PackageInfoSchema), packages),
          topLevelDependencies,
          project.cwd,
          configuration,
          report,
        );
      },
    );
    return inspectReport.exitCode();
  }
}
