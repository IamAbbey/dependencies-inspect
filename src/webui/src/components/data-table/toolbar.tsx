"use client";

import { X } from "lucide-react";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { DataTableFacetedFilter } from "./faceted-filter";
import { DataTableViewOptions } from "./view-options";
import { useDashboardStore } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const groups = useDashboardStore((state) => state.webUIData.groups);
  const config = useDashboardStore((state) => state.webUIData.config);
  const top_level_packages = useDashboardStore(
    (state) => state.webUIData.top_level_packages,
  );
  const has_vulnerabilities = useDashboardStore(
    (state) => state.webUIData.has_vulnerabilities,
  );

  return (
    <div className="flex flex-col flex-wrap gap-3">
      <div className="flex flex-wrap items-start justify-between">
        <div className="flex flex-wrap flex-1 items-center gap-2">
          <Input
            placeholder="Search packages..."
            value={
              typeof table.getColumn("name")?.getFilterValue() === "string"
                ? (table.getColumn("name")?.getFilterValue() as string)
                : ""
            }
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="h-8 w-[250px] lg:w-[350px]"
          />
          {table.getColumn("group") && (
            <DataTableFacetedFilter
              column={table.getColumn("group")}
              title="Filter Group"
              options={groups.map((group) => {
                return { label: group, value: group };
              })}
            />
          )}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-3"
            >
              <p className="text-xs">Reset</p>
              <X className="ml-1 h-2 w-2" />
            </Button>
          )}
        </div>
        <DataTableViewOptions table={table} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {table.getColumn("name") && config.show_all && (
          <div className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
              id="show_top_level_package"
              className="cursor-pointer"
              checked={
                Array.isArray(table.getColumn("name")?.getFilterValue()) ??
                false
              }
              onCheckedChange={(checked) => {
                if (checked === true) {
                  table.getColumn("name")?.setFilterValue(top_level_packages);
                } else {
                  table.getColumn("name")?.setFilterValue(null);
                }
              }}
            />
            <label
              htmlFor="show_top_level_package"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show Top Level Packages
            </label>
          </div>
        )}
        {table.getColumn("update_type") && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_outdated_package"
              className="cursor-pointer"
              checked={
                (table.getColumn("update_type")?.getFilterValue() as boolean) ??
                false
              }
              onCheckedChange={(checked) => {
                if (checked === true) {
                  table.getColumn("update_type")?.setFilterValue(checked);
                } else {
                  table.getColumn("update_type")?.setFilterValue(false);
                }
              }}
            />
            <label
              htmlFor="show_outdated_package"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show Outdated Packages
            </label>
          </div>
        )}
        {has_vulnerabilities && table.getColumn("vulnerabilities") && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_vulnerable_package"
              className="cursor-pointer"
              checked={
                (table
                  .getColumn("vulnerabilities")
                  ?.getFilterValue() as boolean) ?? false
              }
              onCheckedChange={(checked) => {
                if (checked === true) {
                  table.getColumn("vulnerabilities")?.setFilterValue(checked);
                } else {
                  table.getColumn("vulnerabilities")?.setFilterValue(false);
                }
              }}
            />
            <label
              htmlFor="show_vulnerable_package"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show Vulnerable Packages
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
