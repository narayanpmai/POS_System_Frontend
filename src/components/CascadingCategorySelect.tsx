'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toSafeArray } from '@/utils/array';

export interface CategoryNode {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
  parentId?: number | null;
  fullPath?: string;
  level?: number;
  children?: CategoryNode[];
  _count?: { products: number; children?: number };
}

interface CascadingCategorySelectProps {
  categories: CategoryNode[]; // Can be flat or tree
  value: number | string | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function CascadingCategorySelect({
  categories: rawCategories,
  value,
  onChange,
  placeholder = 'Select Category',
  allowClear = false,
  className = '',
  disabled = false,
}: CascadingCategorySelectProps) {
  const categories = toSafeArray<CategoryNode>(rawCategories);
  const [isOpen, setIsOpen] = useState(false);
  const [activePath, setActivePath] = useState<CategoryNode[]>([]); // Active path of open submenus
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Build tree from flat array if needed
  const buildTree = (flatList: CategoryNode[]): CategoryNode[] => {
    // If it's already a tree (roots have children arrays populated correctly)
    const hasRootsWithChildren = flatList.some((c) => c.children && c.children.length > 0);
    if (hasRootsWithChildren) {
      return flatList.filter((c) => !c.parentId);
    }

    const catMap = new Map<number, CategoryNode>();
    flatList.forEach((c) => catMap.set(c.id, { ...c, children: [] }));

    const roots: CategoryNode[] = [];
    flatList.forEach((c) => {
      const node = catMap.get(c.id)!;
      if (c.parentId && catMap.has(c.parentId)) {
        catMap.get(c.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const treeData = buildTree(categories);

  // Flatten helper for search
  const flatten = (nodes: CategoryNode[]): CategoryNode[] => {
    let result: CategoryNode[] = [];
    nodes.forEach((node) => {
      result.push(node);
      if (node.children && node.children.length > 0) {
        result = result.concat(flatten(node.children));
      }
    });
    return result;
  };
  const flatCategories = flatten(treeData);

  // Find currently selected node
  const selectedNode = flatCategories.find((c) => String(c.id) === String(value));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActivePath([]);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (node: CategoryNode) => {
    onChange(node.id);
    setIsOpen(false);
    setActivePath([]);
    setSearchTerm('');
  };

  const renderBreadcrumb = (node: CategoryNode) => {
    const pathStr = node.fullPath || node.name;
    const parts = pathStr.split(' > ');
    return (
      <span className="d-inline-flex align-items-center flex-wrap gap-1">
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <i className="bi bi-chevron-right text-muted opacity-50 fs-8"></i>}
            <span
              className={
                idx === parts.length - 1 ? 'fw-bold text-primary' : 'text-secondary opacity-75'
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
          borderRadius: '10px',
          borderColor: isOpen ? '#0d6efd' : '#dee2e6',
          boxShadow: isOpen ? '0 0 0 3px rgba(13, 110, 253, 0.15)' : 'none',
          minHeight: '40px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onClick={() => {
          setIsOpen(!isOpen);
          setActivePath([]);
          setSearchTerm('');
        }}
      >
        <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
          {selectedNode ? (
            <>
              {selectedNode.image ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/${selectedNode.image}`}
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
              <div className="text-truncate">{renderBreadcrumb(selectedNode)}</div>
            </>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>

        {selectedNode && allowClear && (
          <i
            className="bi bi-x-circle-fill text-secondary opacity-50 me-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          ></i>
        )}
      </button>

      {/* Cascading Menu Wrapper */}
      {isOpen && (
        <div
          className="position-absolute start-0 mt-1 bg-white border rounded-3 shadow-lg d-flex"
          style={{
            zIndex: 1055,
            minWidth: '220px',
            backgroundColor: 'var(--light-card, #ffffff)',
            borderColor: 'var(--border-color, #dee2e6)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px',
            overflow: 'visible',
          }}
        >
          {/* SEARCH MODE OVERRIDE */}
          {searchTerm.trim() ? (
            <div className="p-2 w-100" style={{ minWidth: '260px', maxHeight: '340px', overflowY: 'auto' }}>
              <div className="p-1 mb-2 position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  autoFocus
                  className="form-control form-control-sm ps-5 bg-light"
                  placeholder="Filter category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {flatCategories
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (c.fullPath && c.fullPath.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="p-2 rounded-2 hover-bg-light cursor-pointer d-flex align-items-center justify-content-between mb-1"
                    onClick={() => handleSelect(cat)}
                  >
                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                      <i className="bi bi-folder2 text-secondary flex-shrink-0"></i>
                      <div className="d-flex flex-column text-truncate">
                        <span className="fw-bold text-dark fs-8">{cat.name}</span>
                        {cat.fullPath && (
                          <span className="text-muted fs-8 text-truncate opacity-75">{cat.fullPath}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            /* CASCADING FLYOUT COLUMNS */
            <div className="d-flex position-relative">
              {/* Column 0: Root Categories */}
              <MenuColumn
                nodes={treeData}
                activeNode={activePath[0]}
                selectedId={selectedNode?.id}
                onHoverOrClick={(node) => setActivePath([node])}
                onSelect={handleSelect}
                onSearchInit={(text) => setSearchTerm(text)}
                allowClear={allowClear}
                onClear={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                isRoot
              />

              {/* Column 1: Level 1 Submenu */}
              {activePath[0] && activePath[0].children && activePath[0].children.length > 0 && (
                <MenuColumn
                  nodes={activePath[0].children}
                  activeNode={activePath[1]}
                  selectedId={selectedNode?.id}
                  onHoverOrClick={(node) => setActivePath([activePath[0], node])}
                  onSelect={handleSelect}
                />
              )}

              {/* Column 2: Level 2 Submenu */}
              {activePath[1] && activePath[1].children && activePath[1].children.length > 0 && (
                <MenuColumn
                  nodes={activePath[1].children}
                  activeNode={activePath[2]}
                  selectedId={selectedNode?.id}
                  onHoverOrClick={(node) => setActivePath([activePath[0], activePath[1], node])}
                  onSelect={handleSelect}
                />
              )}

              {/* Column 3: Level 3 Submenu */}
              {activePath[2] && activePath[2].children && activePath[2].children.length > 0 && (
                <MenuColumn
                  nodes={activePath[2].children}
                  activeNode={activePath[3]}
                  selectedId={selectedNode?.id}
                  onHoverOrClick={(node) => setActivePath([activePath[0], activePath[1], activePath[2], node])}
                  onSelect={handleSelect}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-component for individual cascading column menu panel ──
interface MenuColumnProps {
  nodes: CategoryNode[];
  activeNode?: CategoryNode;
  selectedId?: number;
  onHoverOrClick: (node: CategoryNode) => void;
  onSelect: (node: CategoryNode) => void;
  onSearchInit?: (text: string) => void;
  allowClear?: boolean;
  onClear?: () => void;
  isRoot?: boolean;
}

function MenuColumn({
  nodes,
  activeNode,
  selectedId,
  onHoverOrClick,
  onSelect,
  onSearchInit,
  allowClear,
  onClear,
  isRoot = false,
}: MenuColumnProps) {
  return (
    <div
      className="border-end py-2 px-1"
      style={{
        width: '210px',
        maxHeight: '340px',
        overflowY: 'auto',
        backgroundColor: 'var(--light-card, #ffffff)',
      }}
    >
      {/* Root Search Header */}
      {isRoot && onSearchInit && (
        <div className="px-2 pb-2 border-bottom mb-1">
          <input
            type="text"
            className="form-control form-control-sm bg-light"
            placeholder="Search..."
            onChange={(e) => onSearchInit(e.target.value)}
          />
        </div>
      )}

      {isRoot && allowClear && onClear && (
        <div
          className="d-flex align-items-center gap-2 px-2 py-1.5 rounded-2 cursor-pointer text-muted hover-bg-light mb-1"
          style={{ fontSize: '0.85rem' }}
          onClick={onClear}
        >
          <i className="bi bi-dash-circle"></i>
          <span>All Categories</span>
        </div>
      )}

      {nodes.map((node) => {
        const hasChildren = node.children && node.children.length > 0;
        const isActive = activeNode?.id === node.id;
        const isSelected = selectedId === node.id;

        return (
          <div
            key={node.id}
            className={`d-flex align-items-center justify-content-between px-2 py-2 rounded-2 cursor-pointer mb-1 transition-all ${
              isSelected
                ? 'bg-primary text-white fw-bold shadow-sm'
                : isActive
                ? 'bg-primary-subtle text-primary fw-semibold'
                : 'hover-bg-light text-dark'
            }`}
            style={{ fontSize: '0.88rem', cursor: 'pointer' }}
            onMouseEnter={() => onHoverOrClick(node)}
            onClick={() => onSelect(node)}
          >
            <div className="d-flex align-items-center gap-2 text-truncate me-1">
              {node.image ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/${node.image}`}
                  alt=""
                  style={{
                    width: 20,
                    height: 20,
                    objectFit: 'cover',
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <i
                  className={`bi ${
                    isSelected
                      ? 'bi-folder-fill text-white'
                      : hasChildren
                      ? 'bi-folder-fill text-warning'
                      : 'bi-folder2 text-secondary'
                  } flex-shrink-0`}
                ></i>
              )}
              <span className="text-truncate">{node.name}</span>
            </div>

            <div className="d-flex align-items-center gap-1 flex-shrink-0">
              {hasChildren ? (
                <i
                  className={`bi bi-chevron-right fs-8 ${
                    isSelected ? 'text-white' : isActive ? 'text-primary' : 'text-muted opacity-75'
                  }`}
                ></i>
              ) : (
                isSelected && <i className="bi bi-check-lg text-white"></i>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
