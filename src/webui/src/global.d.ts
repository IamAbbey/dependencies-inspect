import { IWindow } from "@/lib/type";

export {};
declare global {
  interface Window {
    webUIData: IWindow;
  }
}
