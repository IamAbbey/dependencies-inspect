import {
  Descriptor,
  Fetcher,
  FetchOptions,
  LinkType,
  Locator,
  MinimalResolveOptions,
  Package,
  Plugin,
  ResolveOptions,
  Resolver,
  structUtils,
} from "@yarnpkg/core";
import { PortablePath, xfs } from "@yarnpkg/fslib";
import { ZipFS } from "@yarnpkg/libzip";

export class UnboundDescriptorResolver implements Resolver {
  supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions) {
    if (!descriptor.range.startsWith(`unbound:`)) return false;

    return true;
  }

  supportsLocator(locator: Locator, opts: MinimalResolveOptions) {
    if (!locator.reference.startsWith(`unbound:`)) return false;

    return true;
  }

  shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions) {
    return true;
  }

  bindDescriptor(
    descriptor: Descriptor,
    fromLocator: Locator,
    opts: MinimalResolveOptions,
  ) {
    return descriptor;
  }

  getResolutionDependencies(
    descriptor: Descriptor,
    opts: MinimalResolveOptions,
  ) {
    return {};
  }

  async getCandidates(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    opts: ResolveOptions,
  ) {
    return [structUtils.convertDescriptorToLocator(descriptor)];
  }

  async getSatisfying(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    locators: Array<Locator>,
    opts: ResolveOptions,
  ) {
    const [locator] = await this.getCandidates(descriptor, dependencies, opts);

    return {
      locators: locators.filter(
        (candidate) => candidate.locatorHash === locator.locatorHash,
      ),
      sorted: false,
    };
  }

  async resolve(locator: Locator, opts: ResolveOptions) {
    return {
      ...locator,

      version: `1.0.0`,

      languageName: `node`,
      linkType: LinkType.HARD,

      conditions: null,

      dependencies: new Map(),
      peerDependencies: new Map(),

      dependenciesMeta: new Map(),
      peerDependenciesMeta: new Map(),

      bin: new Map(),
    };
  }
}

export class ResolutionDependencyResolver implements Resolver {
  supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions) {
    if (!descriptor.range.startsWith(`resdep:`)) return false;

    return true;
  }

  supportsLocator(locator: Locator, opts: MinimalResolveOptions) {
    if (!locator.reference.startsWith(`resdep:`)) return false;

    return true;
  }

  shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions) {
    return false;
  }

  bindDescriptor(
    descriptor: Descriptor,
    fromLocator: Locator,
    opts: MinimalResolveOptions,
  ) {
    return descriptor;
  }

  getResolutionDependencies(
    descriptor: Descriptor,
    opts: MinimalResolveOptions,
  ) {
    const { selector } = structUtils.parseRange(descriptor.range);
    if (selector === null)
      throw new Error(`Assertion failed: The selector should not be null`);

    return {
      dependency: structUtils.parseDescriptor(selector),
    };
  }

  async getCandidates(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    opts: ResolveOptions,
  ) {
    return [structUtils.convertDescriptorToLocator(descriptor)];
  }

  async getSatisfying(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    locators: Array<Locator>,
    opts: ResolveOptions,
  ) {
    const [locator] = await this.getCandidates(descriptor, dependencies, opts);

    return {
      locators: locators.filter(
        (candidate) => candidate.locatorHash === locator.locatorHash,
      ),
      sorted: false,
    };
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    return {
      ...locator,

      version: `1.0.0`,
      languageName: `node`,
      linkType: LinkType.HARD,

      conditions: null,

      dependencies: new Map(),
      peerDependencies: new Map(),

      dependenciesMeta: new Map(),
      peerDependenciesMeta: new Map(),

      bin: new Map(),
    };
  }
}

class NoopFetcher implements Fetcher {
  supports(locator: Locator) {
    if (locator.reference.startsWith(`unbound:`)) return true;

    if (locator.reference.startsWith(`resdep:`)) return true;

    return false;
  }

  getLocalPath(locator: Locator, opts: FetchOptions) {
    return null;
  }

  async fetch(locator: Locator, opts: FetchOptions) {
    const tempDir = await xfs.mktempPromise();
    return {
      packageFs: new ZipFS(`${tempDir}/archive.zip` as PortablePath, {
        create: true,
      }),
      prefixPath: PortablePath.dot,
    };
  }
}

export const TestPlugin: Plugin = {
  resolvers: [UnboundDescriptorResolver, ResolutionDependencyResolver],
  fetchers: [NoopFetcher],
};
