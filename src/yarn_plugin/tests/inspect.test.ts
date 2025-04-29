import { expect, describe, it, vi, afterEach } from "vitest";
import { Inspector } from "../src/commands/inspect";
import { initializeTestRepository } from "./utils/repository";
import { PortablePath } from "@yarnpkg/fslib";
import {
  Cache,
  Configuration,
  Project,
  ThrowReport,
  StreamReport,
} from "@yarnpkg/core";

import { TestPlugin } from "./utils/TestPlugin";
import PnpPlugin from "@yarnpkg/plugin-pnp";
import LinkPlugin from "@yarnpkg/plugin-link";
import { Group } from "../src/types";
const TEST_DEFAULT_OUTPUT_DIR_NAME = "poetry_inspect_report_test";

async function setup() {
  const repository = await initializeTestRepository();
  await Promise.all([
    repository.addPackage("joe"),
    repository.addPackage(
      "foo",
      {
        dependencies: {
          joe: "^1.0.0",
        },
      },
      { version: "1.2.0" },
    ),
    repository.addPackage("bar"),
  ]);
  await repository.registerDependencies(
    [
      { name: "foo", version: "1.2.0" },
      { name: "bar", version: "1.0.0" },
    ],
    ["joe"],
  );
  return {
    repository,
  };
}

const getConfiguration = (p: PortablePath) => {
  return Configuration.create(
    p,
    p,
    new Map([
      [`@yarnpkg/plugin-link`, LinkPlugin],
      [`@yarnpkg/plugin-pnp`, PnpPlugin],
      [`plugin-test`, TestPlugin],
    ]),
  );
};

const defaultOptions = {
  showLatest: false,
  showVulnerability: false,
  showAll: false,
  silent: true,
  outputDir: TEST_DEFAULT_OUTPUT_DIR_NAME,
};

const mocks = vi.hoisted(() => {
  return {
    fetchDescriptorFrom: vi
      .fn()
      .mockReturnValueOnce(Promise.resolve({ range: "packages/bar" }))
      .mockReturnValueOnce(Promise.resolve(null))
      .mockReturnValueOnce(Promise.resolve({ range: "^1.3.0" }))
      .mockReturnValueOnce(Promise.resolve(null)),
    getPackageAudit: vi.fn().mockImplementation(async (packageName) => {
      if (packageName === "foo") {
        const actual = await vi.importActual<
          typeof import("./fixtures/audit_response.json")
        >("./fixtures/audit_response.json");
        return Promise.resolve({
          json: () => Promise.resolve(actual),
        });
      }
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            actions: [],
            advisories: {},
          }),
      });
    }),
  };
});

vi.mock("../src/suggestUtil", () => {
  return {
    fetchDescriptorFrom: mocks.fetchDescriptorFrom,
  };
});

vi.mock(import("../src/inspectUtils"), async (importOriginal) => {
  const mod = await importOriginal(); // type is inferred
  return {
    ...mod,
    // replace some exports
    getPackageAudit: mocks.getPackageAudit,
  };
});

describe(`Inspector`, () => {
  it(`should generate report considering default options`, async () => {
    const { repository } = await setup();
    const { dir } = repository;

    const configuration = await getConfiguration(dir);
    const { project } = await Project.find(configuration, dir);
    const cache = await Cache.find(configuration);

    await project.install({ cache, report: new ThrowReport() });

    const inspector = new Inspector(defaultOptions);

    const { packages, topLevelDependencies } = await inspector.runner(
      project,
      configuration,
      new StreamReport({ configuration, stdout: process.stdout }),
    );

    expect(topLevelDependencies).toBeDefined();
    expect(topLevelDependencies).toHaveLength(2);
    expect(topLevelDependencies).toEqual(["bar", "foo"]);

    expect(packages).toHaveLength(2);
    expect(packages[1].name).toEqual("foo");
    expect(packages[1].current_version).toEqual("1.2.0");
    expect(packages[1].dependencies).toEqual({ joe: "^1.0.0" });
  });

  it(`should generate report for all packages including transitive dependencies`, async () => {
    const { repository } = await setup();
    const { dir } = repository;

    const configuration = await getConfiguration(dir);
    const { project } = await Project.find(configuration, dir);
    const cache = await Cache.find(configuration);

    await project.install({ cache, report: new ThrowReport() });

    const inspector = new Inspector({
      ...defaultOptions,
      showAll: true,
    });

    const { packages, topLevelDependencies } = await inspector.runner(
      project,
      configuration,
      new StreamReport({ configuration, stdout: process.stdout }),
    );

    expect(topLevelDependencies).toBeDefined();
    expect(topLevelDependencies).toHaveLength(2);
    expect(topLevelDependencies).toEqual(["bar", "foo"]);

    expect(packages[1].name).toEqual("foo");
    expect(packages[1].current_version).toEqual("1.2.0");
    expect(packages[1].dependencies).toEqual({ joe: "^1.0.0" });
    expect(packages[1].group).toEqual(Group.MAIN);

    expect(packages).toHaveLength(3);
    expect(packages[2].name).toEqual("joe");
    expect(packages[2].required_by).toEqual(["foo"]);
    expect(packages[2].group).toEqual(Group.DEPENDENCIES);
    expect(packages[2].dependencies).toEqual({});
  });

  it(`should generate report with latest versions`, async () => {
    const { repository } = await setup();
    const { dir } = repository;

    const configuration = await getConfiguration(dir);
    const { project } = await Project.find(configuration, dir);
    const cache = await Cache.find(configuration);

    await project.install({ cache, report: new ThrowReport() });

    const inspector = new Inspector({
      ...defaultOptions,
      showLatest: true,
    });

    const { packages } = await inspector.runner(
      project,
      configuration,
      new StreamReport({ configuration, stdout: process.stdout }),
    );

    expect(mocks.fetchDescriptorFrom).toHaveBeenCalled();

    expect(packages).toHaveLength(2);

    expect(packages[0].name).toEqual("bar");
    expect(packages[0].current_version).toEqual("1.0.0");
    expect(packages[0].latest_version).toEqual("1.0.0");
    expect(packages[0].update_status).toEqual("up-to-date");

    expect(packages[1].name).toEqual("foo");
    expect(packages[1].current_version).toEqual("1.2.0");
    expect(packages[1].latest_version).toEqual("1.3.0");
    expect(packages[1].update_status).toEqual("semver-safe-update");
  });
  it(`should generate report with audit report`, async () => {
    const { repository } = await setup();
    const { dir } = repository;

    const configuration = await getConfiguration(dir);
    const { project } = await Project.find(configuration, dir);
    const cache = await Cache.find(configuration);

    await project.install({ cache, report: new ThrowReport() });

    const inspector = new Inspector({
      ...defaultOptions,
      showVulnerability: true,
    });

    const { packages } = await inspector.runner(
      project,
      configuration,
      new StreamReport({ configuration, stdout: process.stdout }),
    );

    expect(mocks.getPackageAudit).toHaveBeenCalled();

    expect(packages).toHaveLength(2);

    expect(packages[0].name).toEqual("bar");
    expect(packages[0].vulnerabilities).toHaveLength(0);

    expect(packages[1].name).toEqual("foo");
    expect(packages[1].vulnerabilities).toHaveLength(4);
    expect(packages[1].vulnerabilities[0].id).toEqual(1103520);
  });
});

afterEach(() => {
  vi.clearAllMocks(); // Reset all mocked calls between tests
});
