import React from "react";
import { formatTokenValue, formatUSDValue, millifyNumber } from "../../helpers/helpers";

const CustomTableMobile = ({ data, columns, noDataText, isLoading }) => {
  let bodyNodes;
  if (data?.length) {
    bodyNodes = data?.map((d, i) => {
      const colNode = columns?.map((col) => {
        let headerText;
        if (typeof col.header === "function") {
          headerText = col.header();
        } else {
          headerText = col.header;
        }

        let content = null;
        if (typeof col.cell === "function") {
          content = col.cell({
            originalData: d,
          });
        } else if (col.accessorKey) {
          content = d[col.accessorKey];
        }
        return (
          <ItemRow label={headerText} key={col.id || col.header}>
            {content}
          </ItemRow>
        );
      });
      return (
        <div className="border-b border-gray-700 py-4 h4b" key={i}>
          {colNode}
        </div>
      );
    });
  } else if (!isLoading) {
    bodyNodes = (
      <div className="flex justify-center items-center text-gray-400" style={{ height: 300 }}>
        {noDataText || "No Data"}
      </div>
    );
  }

  return <div>{bodyNodes}</div>;
};

const ItemRow = ({ label, children, style = {} }) => {
  return (
    <div className="flex justify-between mb-4" style={style}>
      <div className="h4c text-gray-300">{label}</div>
      <div className="text-right">{children}</div>
    </div>
  );
};

export default CustomTableMobile;