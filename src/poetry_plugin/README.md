# Poetry Plugin: Inspect

[![Poetry](https://img.shields.io/endpoint?url=https://python-poetry.org/badge/v0.json)](https://python-poetry.org/)

This package is a plugin that provide well detailed HTML report about all packages, their dependencies, vulnerabilities and more.

This package is an extension of the inbuilt poetry's show command.

## Installation

The easiest way to install the `inspect` plugin is via the `self add` command of Poetry.

```bash
poetry self add poetry-plugin-inspect
```

If you used `pipx` to install Poetry you can add the plugin via the `pipx inject` command.

```bash
pipx inject poetry poetry-plugin-inspect
```

Otherwise, if you used `pip` to install Poetry you can add the plugin packages via the `pip install` command.

```bash
pip install poetry-plugin-inspect
```


## Usage

The plugin provides a `inspect` command, when invoked generates a well detailed HTML report for all available packages.

```bash
poetry inspect
```

### Available options
- `--latest (l)`: Show the latest version.
- `--with`: The optional dependency groups to include.
- `--without`: The dependency groups to ignore.
