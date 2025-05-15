import React, { useEffect, useState } from "react";
import { useSchema } from "../context/SchemaContext";

interface VisualSqlBuilderProps {
  value: string;
  onChange: (value: string) => void;
  selectedTable: string;
  setSelectedTable: (t: string) => void;
  selectedColumns: string[];
  setSelectedColumns: (cols: string[]) => void;
  limit: number;
  setLimit: (n: number) => void;
}

export default function VisualSqlBuilder({
  value,
  onChange,
  selectedTable,
  setSelectedTable,
  selectedColumns,
  setSelectedColumns,
  limit,
  setLimit,
}: VisualSqlBuilderProps) {
  const { tables, loading, error } = useSchema();
  const [generatedSql, setGeneratedSql] = useState<string>("");
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const table = tables.find(t => t.table_name === selectedTable);
  const allColumns = table ? table.columns.map(col => col.name) : [];
  const allSelected = allColumns.length > 0 && selectedColumns.length === allColumns.length;

  const handleSelectAll = () => setSelectedColumns(allColumns);
  const handleSelectNone = () => setSelectedColumns([]);
  const handleColumnToggle = (col: string) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter(c => c !== col));
    } else {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  // Generate SQL from current selections
  function buildSql(table: string, columns: string[], limit: number) {
    if (!table) return "";
    const cols = columns.length > 0 ? columns.join(", ") : "*";
    return `SELECT ${cols} FROM ${table}${limit ? ` LIMIT ${limit}` : ""}`;
  }

  // Update generated SQL and notify parent on any change
  useEffect(() => {
    const sql = buildSql(selectedTable, selectedColumns, limit);
    setGeneratedSql(sql);
    onChange(sql);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable, selectedColumns, limit]);

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="w-full max-w-full mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-5 flex flex-col gap-5 border border-slate-200 dark:border-zinc-800 overflow-x-auto h-[450px]">
      {/* Table selection */}
      <div>
        <label htmlFor="table-select" className="block font-semibold mb-1 text-slate-800 dark:text-zinc-100">Table <span className="text-xs text-slate-400 ml-1">(Choose a table to query)</span></label>
        <select
          id="table-select"
          className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          value={selectedTable}
          onChange={e => {
            setSelectedTable(e.target.value);
            setSelectedColumns([]);
          }}
          disabled={loading || !!error || tables.length === 0}
        >
          <option value="" disabled>Select a table...</option>
          {tables.map(t => (
            <option key={t.table_name} value={t.table_name}>{t.table_name}</option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-zinc-800 my-1" />

      {/* Columns multiselect */}

      <div className="flex items-center justify-between mb-1">
        <label className="font-semibold text-slate-800 dark:text-zinc-100">Columns <span className="text-xs text-slate-400 ml-1">(Pick columns to include)</span></label>
        <div className="flex gap-2 text-xs">
          <button type="button" className="underline text-blue-600 dark:text-cyan-400 hover:text-blue-800 dark:hover:text-cyan-300 transition-colors" onClick={handleSelectAll} disabled={(allSelected || !selectedTable)}>Select All</button>
          <button type="button" className="underline text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors" onClick={handleSelectNone} disabled={(selectedColumns.length === 0 || !selectedTable)}>None</button>
        </div>
      </div>
      {selectedTable ? (
        <div>
          <div className="flex flex-wrap gap-2">
            {allColumns.map(col => (
              <label
                key={col}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono cursor-pointer select-none transition-all
                  ${selectedColumns.includes(col)
                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-300 dark:border-zinc-700 hover:bg-blue-100 dark:hover:bg-zinc-700 hover:border-blue-400'}
                `}
                tabIndex={0}
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col)}
                  onChange={() => handleColumnToggle(col)}
                  className="accent-blue-600 rounded focus:ring-2 focus:ring-blue-400"
                  tabIndex={-1}
                />
                {col}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <span className="text-s text-slate-600">NA</span>
      )}

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-zinc-800 my-1" />

      {/* Limit input */}
      <div className="flex items-center gap-3">
        <label htmlFor="limit-input" className="font-semibold text-slate-800 dark:text-zinc-100">Limit</label>
        <input
          id="limit-input"
          type="number"
          min={1}
          max={10000}
          className="w-24 rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
        />
        <span className="text-xs text-slate-400 ml-1" title="Maximum number of rows to return">(max rows)</span>
      </div>

      {/* SQL Preview Modal Trigger */}
      {generatedSql && (
        <div className="flex justify-end mt-1">
          <button
            type="button"
            className="text-xs text-blue-700 dark:text-blue-300 underline hover:text-blue-900 dark:hover:text-cyan-200 focus:outline-none"
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
              className="absolute top-3 right-3 text-slate-400 hover:text-blue-600 dark:hover:text-cyan-300 text-lg font-bold focus:outline-none"
              onClick={() => setShowSqlModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="mb-4 text-sm font-semibold text-slate-700 dark:text-zinc-200">Generated SQL</div>
            <pre className="p-3 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-700 dark:text-zinc-200 overflow-x-auto max-w-full whitespace-pre-wrap mb-3">
              {generatedSql}
            </pre>
            <button
              type="button"
              className="px-4 py-2 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
          </div>
        </div>
      )}

      {/* Loading/Error states */}
      {loading && <div className="text-slate-500 dark:text-zinc-400">Loading schema...</div>}
      {error && <div className="text-red-600 font-semibold">{error}</div>}
    </div>
  );
} 