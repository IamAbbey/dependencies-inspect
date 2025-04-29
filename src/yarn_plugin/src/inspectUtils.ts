import * as semver from "semver";
import {
  structUtils,
  Package,
  Project,
  Descriptor,
  DescriptorHash,
} from "@yarnpkg/core";
import { Group, GroupedDescriptor } from "./types";

export function stringifyDescriptor(descriptor: Descriptor): string[] {
  // Returns a string from a descriptor without hash (eg. @types/lodash@^1.0.0).
  const { name, range, scope } = descriptor;
  const range_split = range.split(":").at(-1);
  return scope
    ? [`@${scope}/${name}`, range_split || "*"]
    : [name, range_split || "*"];
}

export function getDependencyGroup(
  dependencies: Map<DescriptorHash, GroupedDescriptor>,
  descriptor: Descriptor,
): Group {
  if (dependencies.has(descriptor.descriptorHash)) {
    const dependency = dependencies.get(descriptor.descriptorHash);
    if (dependency) {
      switch (dependency.group) {
        case "dependencies":
          return Group.MAIN;
        case "devDependencies":
          return Group.DEV;
        case "peerDependencies":
          return Group.PEER;
      }
    }
  }
  return Group.DEPENDENCIES;
}

export function compareVersions(
  currentVersion?: string,
  latestVersion?: string,
) {
  if (!currentVersion || !latestVersion) {
    throw new Error("Both currentVersion and latestVersion must be provided.");
  }

  const currVer = semver.parse(currentVersion);
  const latestVer = semver.parse(latestVersion);

  if (!currVer || !latestVer) {
    throw new Error("Invalid version format.");
  }

  if (semver.lt(currVer, latestVer)) {
    if (semver.major(currVer) < semver.major(latestVer)) {
      return "Major Update";
    } else if (semver.minor(currVer) < semver.minor(latestVer)) {
      return "Minor Update";
    } else {
      return "Patch Update";
    }
  }

  return "Up-to-date";
}

export function getUpdateType(currentVersion?: string, latestVersion?: string) {
  try {
    return compareVersions(currentVersion, latestVersion);
  } catch {
    return "Unknown";
  }
}

export function stdoutLink(text, url) {
  /**
   * Format text + URL as a clickable link for stdout.
   *
   * If attached to a terminal, use escape sequences; otherwise, just return the text.
   */
  if (process.stdout.isTTY) {
    return `\u001b]8;;${url}\u0007${text}\u001b]8;;\u0007`;
  } else {
    return text;
  }
}

export function reverseDep(
  pkg: Package,
  project: Project,
): Record<string, string> {
  const required_by = {};
  for (const locked of project.storedPackages.values()) {
    if (structUtils.isVirtualLocator(locked)) {
      continue;
    }
    const dependencies = {};
    for (const dep of [...locked.dependencies.values()]) {
      const name = structUtils.stringifyIdent(dep);
      const version = structUtils.stringifyDescriptor(dep);
      dependencies[name] = version;
    }
    if (Object.keys(dependencies).includes(pkg.name)) {
      required_by[structUtils.stringifyIdent(locked)] = dependencies[pkg.name];
    }
  }
  return required_by;
}

export function storedPackageDescriptorMap(
  project: Project,
  topLevelDescriptors: Record<string, Descriptor>,
): Record<string, Descriptor> {
  const dependencies = {};
  for (const locked of project.storedPackages.values()) {
    if (structUtils.isVirtualLocator(locked)) {
      continue;
    }
    const pkgIndentStringified = structUtils.stringifyIdent(locked);
    if (!topLevelDescriptors[pkgIndentStringified]) {
      continue;
    }
    dependencies[topLevelDescriptors[pkgIndentStringified].identHash] =
      topLevelDescriptors[pkgIndentStringified];
    for (const dep of [...locked.dependencies.values()]) {
      dependencies[dep.identHash] = dep;
    }
  }
  return dependencies;
}

export function stripSpecifier(versionRange?: string): string | null {
  // Remove ^, ~, >, <, = (and combinations like >=)
  if (!versionRange) {
    return null;
  }
  return versionRange.replace(/[\^~<>=]*\s*/g, "").trim();
}

export function getPackageAudit(
  packageName: string,
  version: string,
): Promise<Response> {
  return fetch("https://registry.npmjs.org/-/npm/v1/security/audits/quick", {
    method: "POST",
    body: JSON.stringify({
      name: "npm_audit_test",
      version: "1.0.0",
      requires: {
        [packageName]: `^${version}`,
      },
      dependencies: {
        [packageName]: {
          version: `${version}`,
        },
      },
    }),
    headers: { "Content-Type": "application/json" },
  });
}

export const REMOTE_WEBUI_ARTIFACT_URL =
  "https://raw.githubusercontent.com/IamAbbey/dependencies-inspect/refs/heads/main/src/yarn_plugin/bundles/%40yarnpkg/webui/index.html";

export async function downloadUIArtifact(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Something went wrong`);
    }

    return await res.text();
  } catch (err) {
    throw new Error(`Something went wrong: ${err}`);
  }
}
