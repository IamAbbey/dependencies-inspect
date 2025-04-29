# yarn-plugin-inspect

inspect is a [yarn berry](https://github.com/yarnpkg/berry) workspace plugin.

## Installation

### If you are using Yarn version 4

```shell
$ yarn plugin import https://raw.githubusercontent.com/iamabbey/dependencies-inspect/main/src/yarn_plugin/bundles/%40yarnpkg/plugin-inspect.js
```

### If you are using Yarn version 2 or 3

inspect depends on [@yarn/plugin-workspace-tools](https://github.com/yarnpkg/berry/tree/master/packages/plugin-workspace-tools). So you need to install workspace-tools first.

```bash
$ yarn plugin import https://raw.githubusercontent.com/iamabbey/dependencies-inspect/main/src/yarn_plugin/bundles/%40yarnpkg/plugin-inspect.js
```

## Usage

### `inspect`

The plugin provides a `inspect` command, when invoked generates a well detailed HTML report for all available packages.

```bash
poetry inspect
```

### Available options
- `--output (o)`: Specify name of the output folder (optional)
- `--latest (l)`: Show the latest version.
- `--vulnerability (x)`: audit packages and report vulnerabilities.
- `--all (a)`: Apply options to all packages, including transitive dependencies.
- `--silent (s)`: Silent report logs.
