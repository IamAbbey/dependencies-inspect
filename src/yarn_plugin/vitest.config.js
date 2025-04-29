import {
  coverageConfigDefaults,
  configDefaults,
  defineConfig,
} from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/bundles/**", ...configDefaults.exclude],
    coverage: {
      exclude: ["**/bundles/**", ...coverageConfigDefaults.exclude],
    },
  },
});
