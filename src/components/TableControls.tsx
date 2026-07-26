'use client';

import React from 'react';

/**
 * TableControls - Reusable component for rows-per-page selector and pagination footer.
 *
 * Usage:
 *   const [rowsPerPage, setRowsPerPage] = useState(10);
 *   const [currentPage, setCurrentPage] = useState(1);
 *   const paged = applyPagination(data, currentPage, rowsPerPage);
 *
 *   <TableControls
 *     total={data.length}
 *     currentPage={currentPage}
 *     rowsPerPage={rowsPerPage}
 *     onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
 *     onPageChange={setCurrentPage}
 *   />
 */

interface TableControlsProps {
  total: number;
  currentPage: number;
  rowsPerPage: number;
  onRowsPerPageChange: (n: number) => void;
  onPageChange: (p: number) => void;
}

export const ROWS_OPTIONS = [5, 10, 25, 50, 100];

/**
 * Slices data array for the current page.
 * Use this for client-side pagination.
 */
export function applyPagination<T>(data: T[], page: number, rowsPerPage: number): T[] {
  const start = (page - 1) * rowsPerPage;
  return data.slice(start, start + rowsPerPage);
}

export default function TableControls({
  total,
  currentPage,
  rowsPerPage,
  onRowsPerPageChange,
  onPageChange,
}: TableControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const start = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, total);

  return (
    <div
      className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 px-1 py-2"
      style={{ borderTop: '1px solid var(--border-color, #dee2e6)', fontSize: '0.875rem' }}
    >
      {/* Left: rows per page selector */}
      <div className="d-flex align-items-center gap-2 text-muted">
        <span>Rows per page:</span>
        <select
          className="form-select form-select-sm"
          style={{ width: '75px' }}
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {ROWS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span className="text-muted">
          {total === 0 ? '0 of 0' : `${start}–${end} of ${total}`}
        </span>
      </div>

      {/* Right: page navigation */}
      <div className="d-flex align-items-center gap-2">
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="First page"
          aria-label="First page"
        >
          <i className="bi bi-chevron-double-left"></i>
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous page"
          aria-label="Previous page"
        >
          <i className="bi bi-chevron-left"></i>
        </button>
        <span className="text-muted px-1">
          Page {currentPage} / {totalPages}
        </span>
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next page"
          aria-label="Next page"
        >
          <i className="bi bi-chevron-right"></i>
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last page"
          aria-label="Last page"
        >
          <i className="bi bi-chevron-double-right"></i>
        </button>
      </div>
    </div>
  );
}
