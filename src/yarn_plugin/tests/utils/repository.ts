import path from "path";
import { npath, ppath, xfs, PortablePath, Filename } from "@yarnpkg/fslib";

export const PACKAGE_WORKSPACE_DIR = `packages`;
export interface Repository {
  dir: PortablePath;
  addPackage: (
    name: string,
    dependencies?: PackageDependencies,
    options?: { path?: string; version?: string },
  ) => void;
  cleanup: () => Promise<void>;
  registerDependencies: (
    dependencies: Dependency[],
    workspaces: string[],
  ) => Promise<void>;
}

export interface PackageDependencies {
  dependencies?: {
    [key: string]: string;
  };
  peerDependencies?: {
    [key: string]: string;
  };
  devDependencies?: {
    [key: string]: string;
  };
}

export interface Dependency {
  name: string;
  version?: string;
}

export async function initializeTestRepository(): Promise<Repository> {
  const repoDir = await xfs.mktempPromise();

  return {
    dir: repoDir,
    addPackage: async (
      name: string,
      packageDependencies: PackageDependencies = {} as PackageDependencies,
      options = {},
    ) => {
      const { version = `1.0.0` } = options;
      await xfs.mkdirpPromise(
        ppath.join(repoDir, `${PACKAGE_WORKSPACE_DIR}/${name}`),
      );
      await xfs.writeJsonPromise(
        ppath.join(
          repoDir,
          `${PACKAGE_WORKSPACE_DIR}/${name}`,
          Filename.manifest,
        ),
        {
          name: name,
          version: version,
          ...packageDependencies,
        },
      );
    },
    registerDependencies: async (
      dependencies: Dependency[],
      workspaces: string[] = [],
    ) => {
      await createPackageJSON(repoDir, dependencies, workspaces);
    },
    cleanup: async () => {
      xfs.detachTemp(repoDir);
    },
  };
}

async function createPackageJSON(
  repoDir: string,
  dependencies: Dependency[],
  workspaces: string[] = [],
) {
  const targetPath = npath.toPortablePath(
    path.join(repoDir, Filename.manifest),
  );

  await xfs.writeJsonPromise(targetPath, {
    name: "test-repo",
    workspaces: workspaces.map((name) => `${PACKAGE_WORKSPACE_DIR}/${name}`),
    dependencies: dependencies.reduce(
      (result: Record<string, string> = {}, item: Dependency) => {
        const { name } = item;
        return { ...result, [name]: `portal:${PACKAGE_WORKSPACE_DIR}/${name}` };
      },
      {},
    ),
  });
}
