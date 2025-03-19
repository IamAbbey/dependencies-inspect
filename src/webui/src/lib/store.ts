import { create } from "zustand";
import {
  PackageInfoSchemaType,
  WebUIDataSchema,
  WebUIDataSchemaType,
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
  fetchPackageInfo: () => void;
}

const defaultWebUIData = {
  groups: [],
  top_level_packages: [],
  packages: [],
  option: {
    show_latest: true,
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
