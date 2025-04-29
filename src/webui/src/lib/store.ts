import { create } from "zustand";
import {
  PackageInfoSchemaType,
  WebUIDataSchema,
  WebUIDataSchemaType,
  TreeDataSchemaType,
} from "./type";
import { produce } from "immer";
import { parse } from "valibot";

interface DashboardState {
  showDashboard: boolean;
  showData: boolean;
  webUIData: WebUIDataSchemaType;
  selectedPackage: PackageInfoSchemaType | null;
  setSelectedPackage: (pkg: PackageInfoSchemaType | null) => void;
  getPackageByName: (name: string) => PackageInfoSchemaType | undefined;
  setWebUIData: (data: WebUIDataSchemaType) => void;
  setShowDashboard: (showDashboard: boolean) => void;
  getTableData: () => PackageInfoSchemaType[];
  getTreeData: () => TreeDataSchemaType;
  fetchPackageInfo: () => void;
}

const defaultWebUIData = {
  groups: [],
  top_level_packages: [],
  packages: [],
  has_vulnerabilities: false,
  config: {
    show_latest: true,
    show_all: false,
    package_manager: "",
  },
} as WebUIDataSchemaType;

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  showDashboard: true,
  showData: false,
  webUIData: parse(WebUIDataSchema, defaultWebUIData),
  selectedPackage: null,
  setSelectedPackage: (pkg) =>
    set(
      produce((state: DashboardState) => {
        state.selectedPackage = pkg;
        state.showDashboard = false;
      }),
    ),
  getPackageByName: (name) => {
    return get().webUIData.packages.find((pkg) => pkg.name === name);
  },
  getTableData: () => {
    const webUIData = get().webUIData;
    const config = get().webUIData.config;
    if (config.show_all) {
      return webUIData.packages;
    }
    return webUIData.packages.filter((pkg) =>
      webUIData.top_level_packages.includes(pkg.name),
    );
  },
  getTreeData: () => {
    const response = {} as TreeDataSchemaType;
    const webUIData = get().webUIData;
    const config = get().webUIData.config;
    for (let index = 0; index < webUIData.packages.length; index++) {
      const element = webUIData.packages[index];
      const dependencies = Object.keys(element.dependencies);
      response[element.name] = {
        index: element.name,
        children: dependencies,
        data: {
          title: element.name,
          group: element.group,
          isTopLevel: webUIData.top_level_packages.includes(element.name),
        },
        isFolder: dependencies.length > 0 && config.show_all,
      };
    }
    return response;
  },
  setWebUIData: (data) =>
    set(
      produce((state: DashboardState) => {
        state.webUIData = data;
      }),
    ),
  setShowDashboard: (showDashboard) =>
    set(
      produce((state: DashboardState) => {
        state.showDashboard = showDashboard;
      }),
    ),
  fetchPackageInfo: async () => {
    try {
      set(
        produce((state: DashboardState) => {
          state.webUIData = parse(WebUIDataSchema, window.webUIData);
          state.showData = true;
        }),
      );
    } catch (error) {
      console.log(error);
      // If the packageInfo data is not available
      set(
        produce((state: DashboardState) => {
          state.webUIData = parse(WebUIDataSchema, defaultWebUIData);
          state.showData = true;
        }),
      );
    }
  },
}));
