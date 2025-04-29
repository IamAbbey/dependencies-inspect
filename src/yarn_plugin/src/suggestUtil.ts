// This borrows from suggestUtil in '@yarnpkg/plugin-essentials'

import {
  Cache,
  structUtils,
  Ident,
  Project,
  ThrowReport,
  Workspace,
  FetchOptions,
  ResolveOptions,
} from "@yarnpkg/core";
import * as semver from "semver";

export enum Modifier {
  CARET = `^`,
  TILDE = `~`,
  EXACT = ``,
}

export type FetchDescriptorFromOptions = {
  project: Project;
  cache: Cache;
  workspace: Workspace;
} & (
  | {
      preserveModifier?: boolean | string;
      modifier?: undefined;
    }
  | {
      preserveModifier?: undefined;
      modifier: Modifier;
    }
);

const SIMPLE_SEMVER = /^([\^~]?)[0-9]+(?:\.[0-9]+){0,2}(?:-\S+)?$/;

export function extractRangeModifier(
  range: string,
  { project }: { project: Project },
) {
  const match = range.match(SIMPLE_SEMVER);

  return match
    ? match[1]
    : project.configuration.get(`defaultSemverRangePrefix`);
}

export async function fetchDescriptorFrom(
  ident: Ident,
  range: string,
  {
    project,
    cache,
    workspace,
    preserveModifier = true,
    modifier,
  }: FetchDescriptorFromOptions,
) {
  const latestDescriptor = project.configuration.normalizeDependency(
    structUtils.makeDescriptor(ident, range),
  );

  const report = new ThrowReport();

  const fetcher = project.configuration.makeFetcher();
  const resolver = project.configuration.makeResolver();

  const fetchOptions: FetchOptions = {
    project,
    fetcher,
    cache,
    checksums: project.storedChecksums,
    report,
    cacheOptions: { skipIntegrityCheck: true },
  };
  const resolveOptions: ResolveOptions = {
    ...fetchOptions,
    resolver,
    fetchOptions,
  };

  // The descriptor has to be bound for the resolvers that need a parent locator. (e.g. FileResolver)
  // If we didn't bind it, `yarn add ./folder` wouldn't work.
  const boundDescriptor = resolver.bindDescriptor(
    latestDescriptor,
    workspace.anchoredLocator,
    resolveOptions,
  );

  const candidateLocators = await resolver.getCandidates(
    boundDescriptor,
    {},
    resolveOptions,
  );
  if (candidateLocators.length === 0) return null;

  // Per the requirements exposed in Resolver.ts, the best is the first one
  const bestLocator = candidateLocators[0];

  const {
    protocol: _protocol,
    source,
    params,
    selector: _selector,
  } = structUtils.parseRange(
    structUtils.convertToManifestRange(bestLocator.reference),
  );
  let protocol = _protocol;
  let selector = _selector;
  if (protocol === project.configuration.get(`defaultProtocol`))
    protocol = null;

  if (semver.valid(selector)) {
    const rawSelector = selector;

    if (typeof modifier !== `undefined`) {
      selector = modifier + selector;
    } else if (preserveModifier !== false) {
      const referenceRange =
        typeof preserveModifier === `string`
          ? preserveModifier
          : latestDescriptor.range;

      const modifier = extractRangeModifier(referenceRange, { project });
      selector = modifier + selector;
    }

    const screeningDescriptor = structUtils.makeDescriptor(
      bestLocator,
      structUtils.makeRange({ protocol, source, params, selector }),
    );
    const screeningLocators = await resolver.getCandidates(
      project.configuration.normalizeDependency(screeningDescriptor),
      {},
      resolveOptions,
    );

    // If turning 1.0.0 into ^1.0.0 would cause it to resolve to something else
    // (for example 1.1.0), then we don't add the modifier.
    //
    // This is to account for "weird" release strategies where things like
    // prereleases are released as older versions than the latest available
    // ones.
    //
    // Ex 1: https://github.com/parcel-bundler/parcel/issues/8010
    // Ex 2: https://github.com/sveltejs/kit/discussions/4645
    if (screeningLocators.length !== 1) {
      selector = rawSelector;
    }
  }

  return structUtils.makeDescriptor(
    bestLocator,
    structUtils.makeRange({ protocol, source, params, selector }),
  );
}
