import { Plugin } from "@yarnpkg/core";
import InspectCommand from "./commands/inspect";

const plugin: Plugin = {
  hooks: {},
  commands: [InspectCommand],
};

export default plugin;
