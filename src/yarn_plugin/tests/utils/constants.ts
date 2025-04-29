import path from "path";

/**
 * Yarn Path in .yarnrc used in testing (path where the actual Yarn executable is located)
 * @see https://yarnpkg.com/configuration/yarnrc#yarnPath
 */
export const YARN_RC_YARN_PATH = path.join(
  ".yarn",
  "releases",
  "yarn-4.0.1.cjs",
);

/**
 * Inspect Path to the Yarn executable used in the repository.
 * Used for copying files when creating test repositories, etc.
 */
export const YARN_RELEASE_FILE_PATH = path.resolve(
  __dirname,
  "../../",
  YARN_RC_YARN_PATH,
);

/**
 * Yarn Inspect Bundle Location
 */
export const YARN_RC_WORKSPACE_SINCE_BUNDLE_PATH = path.join(
  "bundles",
  "@yarnpkg",
  "plugin-inspect.js",
);

/**
 * Yarn Inspect Path
 */
export const YARN_WORKSPACE_SINCE_BUNDLE_FILE_PATH = path.resolve(
  __dirname,
  "..",
  YARN_RC_WORKSPACE_SINCE_BUNDLE_PATH,
);
