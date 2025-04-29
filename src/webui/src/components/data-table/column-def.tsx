"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Package, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PackageInfoSchemaType } from "@/lib/type";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const columnsDefinition: ColumnDef<PackageInfoSchemaType>[] = [
  {
    id: "icon",
    header: () => <></>,
    cell: () => (
      <p>
        <Package size={10} className="opacity-70" />
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="uppercase text-xs has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Package
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-xs">{row.getValue("name")}</div>,
    filterFn: (row, id, value) => {
      if (value !== null) {
        if (typeof value === "string") {
          return (row.getValue(id) as string)
            .toLowerCase()
            .includes(value.toLowerCase());
        } else if (Array.isArray(value)) {
          return value.includes(row.getValue(id));
        }
      }
      return true;
    },
  },
  {
    accessorKey: "current_version",
    header: () => <div className="uppercase text-xs">Current</div>,
    cell: ({ row }) => {
      return (
        <Badge className="bg-blue-700/20 text-blue-700 dark:bg-blue-300/20 dark:text-blue-300 rounded">
          <p className="text-[10px]">{row.getValue("current_version")}</p>
        </Badge>
      );
    },
  },
  {
    accessorKey: "update_type",
    header: () => <div className="uppercase text-xs">Update Type</div>,
    cell: ({ row }) => {
      const update_type = row.getValue("update_type");
      return (
        <Badge
          className={cn(
            update_type == "Up-to-date"
              ? "bg-purple-700/20 text-purple-700 dark:bg-purple-300/20 dark:text-purple-300"
              : "bg-red-700/20 text-red-700 dark:bg-red-700/70 dark:text-white/80",
            "rounded lowercase",
          )}
        >
          <p className="text-[10px]">{row.getValue("update_type")}</p>
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      if (value === true) {
        return !["Up-to-date"].includes(row.getValue(id));
      }
      return true;
    },
  },
  {
    accessorKey: "latest_version",
    header: () => <div className="uppercase text-xs">Latest</div>,
    cell: ({ row }) => {
      return (
        <Badge
          className={cn(
            row.getValue("update_type") == "Up-to-date"
              ? "bg-green-700/20 text-green-700 dark:bg-green-300/20 dark:text-green-300"
              : "bg-red-700/20 text-red-700 dark:bg-red-700/70 dark:text-white",
            "rounded",
          )}
        >
          <p className="text-[10px]">{row.getValue("latest_version") ?? "?"}</p>
        </Badge>
      );
    },
  },
  {
    accessorKey: "group",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="uppercase text-xs has-[>svg]:px-0"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Group
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-xs">{row.getValue("group")}</div>,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "vulnerabilities",
    header: () => <></>,
    cell: ({ row }) => {
      const vulnerabilities = row.getValue("vulnerabilities");
      return (
        <p>
          {Array.isArray(vulnerabilities) && vulnerabilities.length >= 1 ? (
            <TriangleAlert size={14} className="text-orange-500 dark:text-orange-300 opacity-70" />
          ) : (
            <></>
          )}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      const vulnerabilities = row.getValue(id);
      if (value === true) {
        return Array.isArray(vulnerabilities) && vulnerabilities.length >= 1;
      }
      return true;
    },
    enableSorting: false,
    enableHiding: false,
  },
];
