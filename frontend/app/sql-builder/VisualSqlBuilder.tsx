import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle
} from "react";
import { useSchema } from "../context/SchemaContext";
import { useSqlBuilder, type QueryState } from "../context/SqlBuilderContext";
import { useState as useLocalState } from "react";
import { FaArrowUp, FaArrowDown, FaPlus, FaTrash } from "react-icons/fa";

interface VisualSqlBuilderProps {
  queryState: QueryState;
  setQueryState: React.Dispatch<React.SetStateAction<QueryState>>;
  updateFromVisual: (state: QueryState) => void;
}

export type VisualSqlBuilderHandle = {
  getSql: () => string;
};

const VisualSqlBuilder = forwardRef<
  VisualSqlBuilderHandle,
  VisualSqlBuilderProps
>(function VisualSqlBuilder(
  { queryState, setQueryState, updateFromVisual },
  ref
) {
  const { tables, loading, error } = useSchema();
  const [generatedSql, setGeneratedSql] = useState<string>("");
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { generateSql} = useSqlBuilder();
  const {
    table: selectedTable,
    columns: selectedColumns,
    joins,
    limit,
  } = queryState;

  const table = tables.find((t) => t.table_name === selectedTable);
  // Build a list of all tables in the query (base + joins)
  const joinedTables = [
    ...(selectedTable ? [{ table_name: selectedTable }] : []),
    ...joins.map((j) => ({ table_name: j.table })),
  ];
  // Assign aliases: t0, t1, ...
  const tableAliases: Record<string, string> = {};
  joinedTables.forEach((t, i) => {
    tableAliases[t.table_name] = `t${i}`;
  });
  // Build all columns from all tables
  const allTableColumns = joinedTables
    .map((t) => {
      const meta = tables.find((tab) => tab.table_name === t.table_name);
      return meta
        ? meta.columns.map((col) => ({ table: t.table_name, column: col.name }))
        : [];
    })
    .flat();
  const allSelected =
    allTableColumns.length > 0 &&
    selectedColumns.length === allTableColumns.length;

  const handleSelectAll = () => {
    const newState = { ...queryState, columns: allTableColumns };
    setQueryState(newState);
    updateFromVisual(newState);
  };
  const handleSelectNone = () => {
    const newState = { ...queryState, columns: [] };
    setQueryState(newState);
    updateFromVisual(newState);
  };
  const handleColumnToggle = (colObj: { table: string; column: string }) => {
    const exists = selectedColumns.some(
      (c) => c.table === colObj.table && c.column === colObj.column
    );
    let newColumns;
    if (exists) {
      newColumns = selectedColumns.filter(
        (c) => !(c.table === colObj.table && c.column === colObj.column)
      );
    } else {
      newColumns = [...selectedColumns, colObj];
    }
    const newState = { ...queryState, columns: newColumns };
    setQueryState(newState);
    updateFromVisual(newState);
  };

  // Only LEFT JOIN supported for now

  // Add a new join row
  const handleAddJoin = () => {
    const joinTable = tables.find((t) => t.table_name !== selectedTable);
    if (!joinTable || !table) return;
    const newJoins = [
      ...joins,
      {
        type: "LEFT",
        table: joinTable.table_name,
        baseColumn: table.columns[0]?.name || "",
        column: joinTable.columns[0]?.name || "",
      },
    ];
    const newState = { ...queryState, joins: newJoins };
    setQueryState(newState);
    updateFromVisual(newState);
  };

  // Remove a join row
  const handleRemoveJoin = (idx: number) => {
    const newJoins = joins.filter((_, i) => i !== idx);
    const newState = { ...queryState, joins: newJoins };
    setQueryState(newState);
    updateFromVisual(newState);
  };

  // Update a join field
  const handleJoinChange = (idx: number, field: string, value: string) => {
    const newJoins = joins.map((j, i) =>
      i === idx ? { ...j, [field]: value } : j
    );
    const newState = { ...queryState, joins: newJoins };
    setQueryState(newState);
    updateFromVisual(newState);
  };

  // Update generated SQL and notify parent on any change
  useEffect(() => {
    const sql = generateSql(queryState);
    setGeneratedSql(sql);
    // No onChange, parent is updated via updateFromVisual
  }, [queryState, generateSql]);

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  useImperativeHandle(
    ref,
    () => ({
      getSql: () => generatedSql,
    }),
    [generatedSql]
  );

  // Local UI state for collapsible optionals
  const [showFilters, setShowFilters] = useLocalState(false);
  const [showOrderBy, setShowOrderBy] = useLocalState(false);
  const [showLimit, setShowLimit] = useLocalState(false);

  // Filter logic
  const handleAddFilter = () => {
    // Default to first table/column
    const firstTable = joinedTables[0]?.table_name;
    const firstCol =
      tables.find((t) => t.table_name === firstTable)?.columns[0]?.name || "";
    const newFilter = {
      table: firstTable,
      column: firstCol,
      op: "ILIKE",
      value: "",
    };
    const newState = {
      ...queryState,
      filters: [...queryState.filters, newFilter],
    };
    setQueryState(newState);
    updateFromVisual(newState);
  };
  const handleRemoveFilter = (idx: number) => {
    const newFilters = queryState.filters.filter((_, i) => i !== idx);
    const newState = { ...queryState, filters: newFilters };
    setQueryState(newState);
    updateFromVisual(newState);
  };
  const handleFilterChange = (idx: number, field: string, value: string) => {
    const newFilters = queryState.filters.map((f, i) =>
      i === idx ? { ...f, [field]: value } : f
    );
    const newState = { ...queryState, filters: newFilters };
    setQueryState(newState);
    updateFromVisual(newState);
  };

  // Order By logic
  const handleAddOrderBy = () => {
    const firstTable = joinedTables[0]?.table_name;
    const firstCol =
      tables.find((t) => t.table_name === firstTable)?.columns[0]?.name || "";
    const newOrder = {
      table: firstTable,
      column: firstCol,
      direction: "ASC" as "ASC" | "DESC",
    };
    const newState = {
      ...queryState,
      orderBy: [...queryState.orderBy, newOrder],
    };
    setQueryState(newState);
    updateFromVisual(newState);
  };
  const handleRemoveOrderBy = (idx: number) => {
    const newOrderBy = queryState.orderBy.filter((_, i) => i !== idx);
    const newState = { ...queryState, orderBy: newOrderBy };
    setQueryState(newState);
    updateFromVisual(newState);
  };
  const handleToggleOrderByDirection = (idx: number) => {
    const newOrderBy = queryState.orderBy.map((o, i) =>
      i === idx
        ? { ...o, direction: o.direction === "ASC" ? "DESC" : "ASC" }
        : o
    ) as { table: string; column: string; direction: "ASC" | "DESC" }[];
    const newState = { ...queryState, orderBy: newOrderBy };
    setQueryState(newState);
    updateFromVisual(newState);
  };
  const handleOrderByChange = (idx: number, field: string, value: string) => {
    const newOrderBy = queryState.orderBy.map((o, i) => {
      if (i !== idx) return o;
      if (field === "direction") {
        return {
          ...o,
          direction: (value === "DESC" ? "DESC" : "ASC") as "ASC" | "DESC",
        };
      }
      return { ...o, [field]: value };
    }) as { table: string; column: string; direction: "ASC" | "DESC" }[];
    const newState = { ...queryState, orderBy: newOrderBy };
    setQueryState(newState);
    updateFromVisual(newState);
  };

  return (
    <div className="w-full max-w-full mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-5 flex flex-col gap-5 border border-slate-200 dark:border-zinc-800 overflow-x-auto h-[575px]">
      {/* Table selection */}
      <div>
        <label
          htmlFor="table-select"
          className="block font-semibold mb-1 text-slate-800 dark:text-zinc-100"
        >
          Data Table
        </label>
        <select
          id="table-select"
          className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          value={selectedTable}
          onChange={(e) => {
            setQueryState((prev) => ({ ...prev, table: e.target.value }));
          }}
          disabled={loading || !!error || tables.length === 0}
          aria-label="Select the main data table"
          title="Pick the main table you want to explore."
        >
          <option value="" disabled>
            Select a table...
          </option>
          {tables.map((t) => (
            <option key={t.table_name} value={t.table_name}>
              {t.table_name}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-zinc-800 my-1" />

      {/* Joins UI (moved above columns) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-semibold text-slate-800 dark:text-zinc-100">
            Combine Data From Another Table
          </label>
          <button
            type="button"
            className="underline text-blue-600 dark:text-cyan-400 hover:text-blue-800 dark:hover:text-cyan-300 text-xs transition-colors"
            onClick={handleAddJoin}
            disabled={!selectedTable || tables.length < 2}
            aria-label="Add another table to combine"
            title="Add another table to combine with your main table."
          >
            <FaPlus className="inline mr-1" /> Add Table
          </button>
        </div>
        {joins.length === 0 && (
          <div className="text-xs text-slate-500 dark:text-zinc-400 mb-2">
            No tables combined.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {joins.map((join, idx) => {
            const joinTable = tables.find((t) => t.table_name === join.table);
            const baseTable = tables.find(
              (t) => t.table_name === selectedTable
            );
            return (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 mb-1 bg-white dark:bg-zinc-900 rounded-lg p-2 shadow-sm border border-slate-200 dark:border-zinc-800"
              >
                {/* Table to combine */}
                <select
                  className="rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  value={join.table}
                  onChange={(e) => {
                    const newTable = e.target.value;
                    const newJoinTable = tables.find(
                      (t) => t.table_name === newTable
                    );
                    setQueryState((prev) => ({
                      ...prev,
                      joins: prev.joins.map((j, i) =>
                        i === idx
                          ? {
                              ...j,
                              table: newTable,
                              column: newJoinTable?.columns[0]?.name || "",
                            }
                          : j
                      ),
                    }));
                  }}
                  aria-label="Select table to combine"
                  title="Pick another table to combine with your main table."
                >
                  {tables
                    .filter((t) => t.table_name !== selectedTable)
                    .map((t) => (
                      <option key={t.table_name} value={t.table_name}>
                        {t.table_name}
                      </option>
                    ))}
                </select>
                {/* Main table column */}
                <select
                  className="rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  value={join.baseColumn}
                  onChange={(e) =>
                    handleJoinChange(idx, "baseColumn", e.target.value)
                  }
                  aria-label="Select column from main table"
                  title="Pick a column from your main table to match with the other table."
                >
                  {baseTable?.columns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
                </select>
                <span className="text-slate-500 dark:text-zinc-400 text-xs">
                  matches
                </span>
                {/* Other table column */}
                <select
                  className="rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  value={join.column}
                  onChange={(e) =>
                    handleJoinChange(idx, "column", e.target.value)
                  }
                  aria-label="Select column from other table"
                  title="Pick a column from the other table to match with your main table."
                >
                  {joinTable?.columns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ml-2 p-1 rounded-full bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-700 text-red-600 dark:text-red-300"
                  onClick={() => handleRemoveJoin(idx)}
                  title="Remove this table combination"
                  aria-label="Remove combine"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Columns multiselect (now for all tables, grouped by table) */}
      <div className="flex items-center justify-between mb-1 mt-4">
        <label className="font-semibold text-slate-800 dark:text-zinc-100">
          Columns to Show
        </label>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className="underline text-blue-600 hover:text-blue-800 transition-colors"
            onClick={handleSelectAll}
            disabled={allSelected}
          >
            Select All
          </button>
          <button
            type="button"
            className="underline text-slate-500 hover:text-slate-700 transition-colors"
            onClick={handleSelectNone}
            disabled={selectedColumns.length === 0}
          >
            None
          </button>
        </div>
      </div>
      {joinedTables.length > 0 ? (
        <div className="flex flex-col gap-4">
          {joinedTables.map((t, idx) => {
            const meta = tables.find((tab) => tab.table_name === t.table_name);
            if (!meta) return null;
            // Color palette for pills
            const pillColors = [
              "bg-blue-600 text-white border-blue-600", // base
              "bg-green-600 text-white border-green-600", // join 1
              "bg-yellow-500 text-white border-yellow-500", // join 2
              "bg-purple-600 text-white border-purple-600", // join 3
              "bg-pink-600 text-white border-pink-600", // join 4
              "bg-cyan-600 text-white border-cyan-600", // join 5
            ];
            const pillColor = pillColors[idx % pillColors.length];
            return (
              <div key={t.table_name} className="mb-1">
                <div className="mb-1 text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <span className="uppercase tracking-wide">
                    {t.table_name}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    ({tableAliases[t.table_name]})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meta.columns.map((col) => {
                    const colObj = { table: t.table_name, column: col.name };
                    const checked = selectedColumns.some(
                      (c) => c.table === t.table_name && c.column === col.name
                    );
                    return (
                      <label
                        key={`${t.table_name}.${col.name}`}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono cursor-pointer select-none transition-all
                          ${
                            checked
                              ? pillColor
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-300 dark:border-zinc-700 hover:bg-blue-100 dark:hover:bg-zinc-700 hover:border-blue-400"
                          }
                        `}
                        tabIndex={0}
                        title={
                          checked
                            ? "Column will be shown in your results"
                            : "Click to show this column in your results"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleColumnToggle(colObj)}
                          className="accent-blue-600 rounded focus:ring-2 focus:ring-blue-400"
                          tabIndex={-1}
                          aria-label={`Show column ${col.name}`}
                        />
                        {col.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <span className="text-s text-slate-600">NA</span>
      )}

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-zinc-800 my-1" />

      {/* Optional Section */}
      <div className="mt-6">
        <div className="mb-2 text-lg font-bold text-slate-800 dark:text-zinc-100">
          Optional Settings
        </div>
        {/* Filters */}
        <div className="mb-4 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-blue-700 focus:outline-none"
            onClick={() => setShowFilters((v) => !v)}
          >
            <span>Filter Your Results (WHERE)</span>
            <span>{showFilters ? "▲" : "▼"}</span>
          </button>
          {showFilters && (
            <div className="px-4 pb-4">
              {queryState.filters.length === 0 && (
                <div className="text-xs text-slate-500 dark:text-zinc-400 mb-2">
                  No filters added.
                </div>
              )}
              {queryState.filters.map((f, idx) => {
                const tableMeta = tables.find((t) => t.table_name === f.table);
                return (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-2 mb-2"
                  >
                    <select
                      className="rounded border px-2 py-1 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                      value={f.table}
                      onChange={(e) =>
                        handleFilterChange(idx, "table", e.target.value)
                      }
                    >
                      {joinedTables.map((t) => (
                        <option key={t.table_name} value={t.table_name}>
                          {t.table_name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border px-2 py-1 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                      value={f.column}
                      onChange={(e) =>
                        handleFilterChange(idx, "column", e.target.value)
                      }
                    >
                      {tableMeta?.columns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border px-2 py-1 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                      value={f.op}
                      onChange={(e) =>
                        handleFilterChange(idx, "op", e.target.value)
                      }
                      aria-label="Choose how to compare values"
                    >
                      {["=", "!=", "<", ">", "<=", ">=", "ILIKE"].map((op) => (
                        <option key={op} value={op}>
                          {op === "ILIKE" ? "contains" : op}
                        </option>
                      ))}
                    </select>
                    <input
                      className="rounded border px-2 py-1 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                      value={f.value}
                      onChange={(e) =>
                        handleFilterChange(idx, "value", e.target.value)
                      }
                      placeholder="Value"
                      aria-label="Value to filter by"
                    />
                    <button
                      type="button"
                      className="text-xs underline text-red-500 hover:text-red-700 ml-2"
                      onClick={() => handleRemoveFilter(idx)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="mt-2 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700"
                onClick={handleAddFilter}
              >
                + Add Filter
              </button>
            </div>
          )}
        </div>
        {/* Order By */}
        <div className="mb-4 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-blue-700 focus:outline-none"
            onClick={() => setShowOrderBy((v) => !v)}
          >
            <span>Sort Results (Order By)</span>
            <span>{showOrderBy ? "▲" : "▼"}</span>
          </button>
          {showOrderBy && (
            <div className="px-4 pb-4">
              {queryState.orderBy.length === 0 && (
                <div className="text-xs text-slate-500 dark:text-zinc-400 mb-2">
                  No order by clauses.
                </div>
              )}
              {queryState.orderBy.map((o, idx) => {
                const tableMeta = tables.find((t) => t.table_name === o.table);
                return (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-2 mb-2"
                  >
                    <select
                      className="rounded border px-2 py-1 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                      value={o.table}
                      onChange={(e) =>
                        handleOrderByChange(idx, "table", e.target.value)
                      }
                    >
                      {joinedTables.map((t) => (
                        <option key={t.table_name} value={t.table_name}>
                          {t.table_name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border px-2 py-1 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                      value={o.column}
                      onChange={(e) =>
                        handleOrderByChange(idx, "column", e.target.value)
                      }
                    >
                      {tableMeta?.columns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border px-2 py-1 text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
                      value={o.direction}
                      onChange={(e) =>
                        handleOrderByChange(idx, "direction", e.target.value)
                      }
                    >
                      {["ASC", "DESC"].map((dir) => (
                        <option key={dir} value={dir}>
                          {dir}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={`ml-2 p-1 rounded-full ${
                        o.direction === "ASC"
                          ? "bg-blue-100 dark:bg-blue-900"
                          : "bg-yellow-100 dark:bg-yellow-900"
                      } hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-600 dark:text-blue-300 transition-colors`}
                      onClick={() => handleToggleOrderByDirection(idx)}
                      aria-label={
                        o.direction === "ASC"
                          ? "Sort ascending"
                          : "Sort descending"
                      }
                    >
                      {o.direction === "ASC" ? (
                        <FaArrowUp size={14} />
                      ) : (
                        <FaArrowDown size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      className="text-xs underline text-red-500 hover:text-red-700 ml-2"
                      onClick={() => handleRemoveOrderBy(idx)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="mt-2 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700"
                onClick={handleAddOrderBy}
              >
                + Add Order By
              </button>
            </div>
          )}
        </div>
        {/* Limit */}
        <div className="mb-4 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-blue-700 focus:outline-none"
            onClick={() => setShowLimit((v) => !v)}
          >
            <span>Limit Results</span>
            <span>{showLimit ? "▲" : "▼"}</span>
          </button>
          {showLimit && (
            <div className="px-4 pb-4 flex items-center gap-3">
              <input
                id="limit-input"
                type="number"
                min={1}
                max={10000}
                className="w-24 rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={limit}
                onChange={(e) =>
                  setQueryState((prev) => ({
                    ...prev,
                    limit: Number(e.target.value),
                  }))
                }
                aria-label="Set maximum number of rows"
              />
              <span
                className="text-xs text-slate-400 ml-1"
                title="Maximum number of rows to return"
              >
                (max rows)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SQL Preview Modal Trigger */}
      {generatedSql && (
        <div className="flex justify-end mt-1">
          <button
            type="button"
            className="text-xs text-blue-700 underline hover:text-blue-900 focus:outline-none"
            onClick={() => setShowSqlModal(true)}
          >
            Show SQL
          </button>
        </div>
      )}

      {/* SQL Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 border border-slate-200 dark:border-zinc-700 max-w-lg w-full relative overflow-x-auto">
            <button
              type="button"
              className="absolute top-3 right-3 text-slate-400 hover:text-blue-600 text-lg font-bold focus:outline-none"
              onClick={() => setShowSqlModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="mb-4 text-sm font-semibold text-slate-700 dark:text-zinc-200">
              Generated SQL
            </div>
            <pre className="p-3 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-700 dark:text-zinc-200 overflow-x-auto max-w-full whitespace-pre-wrap mb-3">
              {generatedSql}
            </pre>
            <button
              type="button"
              className="px-4 py-2 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? "Copied!" : "Copy SQL"}
            </button>
          </div>
        </div>
      )}

      {/* Loading/Error states */}
      {loading && (
        <div className="text-slate-500 dark:text-zinc-400">
          Loading schema...
        </div>
      )}
      {error && <div className="text-red-600 font-semibold">{error}</div>}
    </div>
  );
});

export default VisualSqlBuilder;
