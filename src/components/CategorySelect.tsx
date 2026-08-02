'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toSafeArray } from '@/utils/array';

export interface CategoryOption {
  id: number;
  name: string;
  parentId?: number | null;
  fullPath?: string;
  level?: number;
  image?: string | null;
}

interface CategorySelectProps {
  categories: CategoryOption[];
  value: number | string | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function CategorySelect({
  categories: rawCategories,
  value,
  onChange,
  placeholder = 'Select Category',
  allowClear = false,
  className = '',
  disabled = false,
}: CategorySelectProps) {
  const categories = toSafeArray<CategoryOption>(rawCategories);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCategory = categories.find((c) => String(c.id) === String(value));

  // Build sorted hierarchy order for clean tree-like dropdown listing
  const getSortedTreeList = (): CategoryOption[] => {
    const roots = categories.filter((c) => !c.parentId);
    const result: CategoryOption[] = [];
    const visited = new Set<number>();

    const addWithChildren = (cat: CategoryOption) => {
      if (visited.has(cat.id)) return;
      visited.add(cat.id);
      result.push(cat);
      const children = categories.filter((c) => c.parentId === cat.id);
      children.forEach(addWithChildren);
    };

    roots.forEach(addWithChildren);
    // Append any orphaned categories not reached
    categories.forEach((c) => {
      if (!visited.has(c.id)) {
        visited.add(c.id);
        result.push(c);
      }
    });

    return result;
  };

  const treeOrderedCategories = getSortedTreeList();

  const filteredCategories = treeOrderedCategories.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.fullPath && c.fullPath.toLowerCase().includes(term))
    );
  });

  const renderBreadcrumb = (fullPath?: string, name?: string) => {
    const pathStr = fullPath || name || '';
    const parts = pathStr.split(' > ');
    if (parts.length <= 1) {
      return <span className="fw-semibold text-dark">{pathStr}</span>;
    }
    return (
      <span className="d-inline-flex align-items-center flex-wrap gap-1">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <i className="bi bi-chevron-right text-muted opacity-50 fs-8"></i>}
            <span
              className={
                i === parts.length - 1
                  ? 'fw-bold text-primary'
                  : 'text-secondary opacity-75'
              }
              style={{ fontSize: '0.85rem' }}
            >
              {part}
            </span>
          </React.Fragment>
        ))}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={`position-relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        className="form-select d-flex align-items-center justify-content-between text-start w-100 py-2 px-3 bg-white"
        style={{
          borderRadius: '8px',
          borderColor: isOpen ? '#0d6efd' : '#dee2e6',
          boxShadow: isOpen ? '0 0 0 3px rgba(13, 110, 253, 0.15)' : 'none',
          minHeight: '38px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
          {selectedCategory ? (
            <>
              {selectedCategory.image ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/${selectedCategory.image}`}
                  alt=""
                  style={{
                    width: 22,
                    height: 22,
                    objectFit: 'cover',
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <i className="bi bi-folder-fill text-warning flex-shrink-0"></i>
              )}
              <div className="text-truncate">{renderBreadcrumb(selectedCategory.fullPath, selectedCategory.name)}</div>
            </>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>

        {selectedCategory && allowClear && (
          <i
            className="bi bi-x-circle-fill text-secondary opacity-50 hover-opacity-100 me-2"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          ></i>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="position-absolute start-0 w-100 mt-1 bg-white border rounded-3 shadow-lg p-2"
          style={{
            zIndex: 1055,
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Box */}
          <div className="p-1 mb-2 position-relative">
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
            <input
              type="text"
              autoFocus
              className="form-control form-control-sm ps-5 bg-light"
              placeholder="Search category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Category List */}
          <div className="overflow-auto custom-scrollbar flex-grow-1">
            {allowClear && (
              <div
                className="dropdown-item py-2 px-3 rounded-2 cursor-pointer text-muted d-flex align-items-center gap-2"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
              >
                <i className="bi bi-dash-circle"></i>
                <span>-- None / All Categories --</span>
              </div>
            )}

            {filteredCategories.length === 0 ? (
              <div className="text-center text-muted py-3 fs-8">No matching category found</div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = String(cat.id) === String(value);
                const level = cat.level ?? 0;
                const indent = searchTerm.trim() ? 0 : level * 20;

                return (
                  <div
                    key={cat.id}
                    className={`py-2 px-3 rounded-2 cursor-pointer transition-all d-flex align-items-center justify-content-between mb-1 ${
                      isSelected
                        ? 'bg-primary-subtle text-primary fw-bold'
                        : 'hover-bg-light text-dark'
                    }`}
                    style={{
                      paddingLeft: `${12 + indent}px`,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      onChange(cat.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                      {!searchTerm.trim() && level > 0 && (
                        <span className="text-muted opacity-50 font-mono" style={{ fontSize: '0.8rem' }}>
                          └
                        </span>
                      )}
                      {cat.image ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/${cat.image}`}
                          alt=""
                          style={{
                            width: 22,
                            height: 22,
                            objectFit: 'cover',
                            borderRadius: 4,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <i
                          className={`bi ${
                            level === 0
                              ? 'bi-folder-fill text-warning'
                              : level === 1
                              ? 'bi-folder2 text-secondary'
                              : 'bi-file-earmark text-muted'
                          } flex-shrink-0`}
                        ></i>
                      )}

                      <div className="d-flex flex-column text-truncate">
                        <span className="text-truncate">{cat.name}</span>
                        {cat.fullPath && level > 0 && (
                          <span
                            className="text-muted text-truncate opacity-75"
                            style={{ fontSize: '0.72rem', fontWeight: 'normal' }}
                          >
                            {cat.fullPath}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-1 flex-shrink-0">
                      {level === 0 ? (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill fs-8">
                          Root
                        </span>
                      ) : (
                        <span className="badge bg-secondary-subtle text-secondary rounded-pill fs-8">
                          L{level}
                        </span>
                      )}
                      {isSelected && <i className="bi bi-check-lg text-primary ms-1"></i>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
