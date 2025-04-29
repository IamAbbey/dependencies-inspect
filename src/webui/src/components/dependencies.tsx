import { cn, GROUP_COLORS } from "@/lib/utils";
import {
  Expand,
  Download,
  ChevronRight,
  Minus,
  ChevronDown,
} from "lucide-react";
import { Bullet } from "@/components/ui/bullet";
import { Badge } from "@/components/ui/badge";
import {
  ControlledTreeEnvironment,
  Tree,
  TreeItemIndex,
} from "react-complex-tree";
import { useDashboardStore } from "@/lib/store";
import { TreeDataSchemaType } from "@/lib/type";
import { useState } from "react";

type DependenciesProps = {} & React.ComponentProps<"div">;

export function Dependencies({ className }: DependenciesProps) {
  const data = useDashboardStore((state) => state.webUIData);

  return (
    <div className={cn(className)}>
      <div className="border border-x-0 flex py-1 px-4 gap-2">
        <span>⛓️‍💥</span>
        <p>Dependencies</p>
      </div>

      <div className="flex flex-col">
        <div className="py-2 px-4 flex flex-col gap-3">
          <div className="text-xs flex justify-between items-center">
            <p>Dependency Tree</p>
            <div className="flex gap-2">
              <Expand size={14} />
              <Download size={14} />
            </div>
          </div>

          <div className="text-xs flex flex-wrap gap-3 items-center">
            {data.groups.map((group, index) => {
              return (
                <div key={index} className="flex gap-1 items-center">
                  <Bullet
                    style={{ backgroundColor: GROUP_COLORS[index].value }}
                  />{" "}
                  {group}
                </div>
              );
            })}
          </div>

          <div className="bg-primary-foreground text-xs flex rounded justify-between items-center p-2">
            <div className="flex gap-1 items-center">
              <p className="font-semibold">{data.packages.length}</p>{" "}
              <span className="opacity-70">total</span>
            </div>
            <div className="flex gap-1 items-center">
              <p className="font-semibold">{data.top_level_packages.length}</p>{" "}
              <span className="opacity-70">direct</span>
            </div>
            <div className="flex gap-1 items-center">
              <p className="font-semibold">{data.groups.length}</p>{" "}
              <span className="opacity-70">types</span>
            </div>
          </div>
        </div>

        <div className="text-xs flex justify-between items-center border border-x-0 px-4 py-1">
          <p>Direct Dependencies</p>
          <Badge className="bg-primary-foreground text-primary">
            <p className="text-[10px]">{data.top_level_packages.length}</p>
          </Badge>
        </div>

        <div
          className="px-4 pt-2 mb-2"
          style={{ height: "75vh", overflowY: "auto" }}
        >
          <TreeApp />
        </div>
      </div>
    </div>
  );
}

function TreeApp() {
  const webUIData = useDashboardStore((state) => state.webUIData);
  const getTreeData = useDashboardStore((state) => state.getTreeData);
  const setSelectedPackage = useDashboardStore(
    (state) => state.setSelectedPackage,
  );

  const [focusedItem, setFocusedItem] = useState<TreeItemIndex>();
  const [expandedItems, setExpandedItems] = useState<TreeItemIndex[]>([]);
  const [selectedItems, setSelectedItems] = useState<TreeItemIndex[]>([]);

  if (webUIData.packages.length == 0) return <p>No packages</p>;

  const response: TreeDataSchemaType = getTreeData();

  const items = {
    root: {
      index: "root",
      isFolder: true,
      children: webUIData.top_level_packages,
      data: {
        title: "Root item",
        group: "-",
        isTopLevel: true,
      },
    },
    ...response,
  };

  return (
    <ControlledTreeEnvironment
      items={items}
      getItemTitle={(item) => item.data.title}
      viewState={{
        ["dependency-tree"]: {
          focusedItem,
          expandedItems,
          selectedItems,
        },
      }}
      onFocusItem={(item) => setFocusedItem(item.index)}
      onExpandItem={(item) => {
        if (item.data.isTopLevel && expandedItems.length > 1) {
          setExpandedItems([item.index]);
        } else {
          setExpandedItems([...expandedItems, item.index]);
        }
      }}
      onCollapseItem={(item) => {
        setExpandedItems(
          expandedItems.filter(
            (expandedItemIndex) => expandedItemIndex !== item.index,
          ),
        );
      }}
      onSelectItems={(items) => setSelectedItems(items)}
      canDragAndDrop={false}
      canDropOnFolder={false}
      canReorderItems={false}
      renderItem={({ title, arrow, context, children, item }) => {
        return (
          <>
            <li
              {...context.itemContainerWithChildrenProps}
              className={cn("mb-2 text-xs cursor-pointer")}
              onClick={() => {
                const pkg = webUIData.packages.find(
                  (p) => p.name == item.data.title,
                );
                if (pkg) {
                  setSelectedPackage(pkg);
                }
              }}
            >
              <div
                {...context.itemContainerWithoutChildrenProps}
                {...context.interactiveElementProps}
              >
                {arrow ? (
                  arrow
                ) : webUIData.config.show_all ? (
                  <Minus
                    className="inline-block"
                    color="transparent"
                    size={14}
                  />
                ) : null}
                {title}
              </div>
            </li>
            <div
              className={cn(
                "ml-1.5 pl-2",
                context.isExpanded ? "border-l-2" : "",
              )}
            >
              {children}
            </div>
          </>
        );
      }}
      renderItemsContainer={({ children, containerProps }) => (
        <ul className="text-xs" {...containerProps}>
          {children}
        </ul>
      )}
      renderItemTitle={({ title, item }) => {
        const groupIndex = webUIData.groups.indexOf(item.data.group);

        return (
          <div className="ml-2 text-xs inline-flex gap-1.5 items-center">
            <Bullet
              style={{
                backgroundColor:
                  groupIndex == -1 ? "#a3a3a3" : GROUP_COLORS[groupIndex].value,
              }}
            />{" "}
            <span>{title}</span>{" "}
            <Badge className="bg-primary-foreground text-white/70">
              <p className="text-[10px]">
                {item.children ? item.children.length : 0}
              </p>
            </Badge>{" "}
          </div>
        );
      }}
      renderItemArrow={({ item, context }) =>
        item.isFolder ? (
          <span {...context.arrowProps}>
            {context.isExpanded ? (
              <ChevronDown className="inline-block" size={14} />
            ) : (
              <ChevronRight className="inline-block" size={14} />
            )}
          </span>
        ) : null
      }
    >
      <Tree
        treeId="dependency-tree"
        rootItem="root"
        treeLabel="Dependency Tree"
      />
    </ControlledTreeEnvironment>
  );
}
