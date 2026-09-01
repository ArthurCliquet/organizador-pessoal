import { useEffect, useState } from 'react';
import type { Folder } from '../../types';

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, parentId: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (folder: Folder) => void;
}

interface TreeNode {
  folder: Folder;
  children: TreeNode[];
}

function buildTree(folders: Folder[], parentId: string | null): TreeNode[] {
  return folders.filter((f) => f.parent_id === parentId).map((folder) => ({ folder, children: buildTree(folders, folder.id) }));
}

function ancestorIds(folders: Folder[], id: string): string[] {
  const folder = folders.find((f) => f.id === id);
  if (!folder || !folder.parent_id) return [];
  return [folder.parent_id, ...ancestorIds(folders, folder.parent_id)];
}

export function FolderList({ folders, selectedFolderId, onSelect, onCreate, onRename, onDelete, onTogglePin }: FolderListProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [creatingUnderId, setCreatingUnderId] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedFolderId) return;
    const ancestors = ancestorIds(folders, selectedFolderId);
    if (ancestors.length === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedFolderId, folders]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(node: TreeNode, depth: number) {
    const { folder, children } = node;
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(folder.id);
    return (
      <div key={folder.id} className="shrink-0 md:shrink">
        <div className={`f-row group ${selectedFolderId === folder.id ? 'active' : ''}`}>
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(folder.id)}
              className="twirl hover:text-app-text"
              style={{ marginLeft: `${depth * 12}px` }}
              title={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="twirl" style={{ marginLeft: `${depth * 12}px` }} />
          )}
          {editingId === folder.id ? (
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => {
                if (editingName.trim()) onRename(folder.id, editingName.trim());
                setEditingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              size={1}
              className="w-28 md:w-auto md:flex-1 md:min-w-0 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
            />
          ) : (
            <button
              onClick={() => onSelect(folder.id)}
              onDoubleClick={() => {
                setEditingId(folder.id);
                setEditingName(folder.name);
              }}
              className="name w-28 md:w-auto md:flex-1 text-left truncate"
            >
              {folder.name}
            </button>
          )}
          <div className="f-row-actions opacity-100 md:opacity-0 md:group-hover:opacity-100">
            <button onClick={() => setCreatingUnderId(folder.id)} className="f-icon-btn" title="Nova sub-pasta">
              <IconPlus />
            </button>
            <button
              onClick={() => onTogglePin(folder)}
              className={`f-icon-btn ${folder.pinned_at ? 'pin-on' : ''}`}
              title={folder.pinned_at ? 'Desafixar' : 'Fixar'}
            >
              <IconPin filled={!!folder.pinned_at} />
            </button>
            <button onClick={() => onDelete(folder.id)} className="f-icon-btn danger" title="Excluir pasta">
              <IconTrash />
            </button>
          </div>
        </div>
        {creatingUnderId === folder.id && (
          <div className="f-new-row" style={{ paddingLeft: `${depth * 12 + 28}px`, paddingRight: 8 }}>
            <input
              autoFocus
              value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              onBlur={() => {
                setCreatingUnderId(null);
                setCreatingName('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && creatingName.trim()) {
                  onCreate(creatingName.trim(), folder.id);
                  setExpandedIds((prev) => new Set(prev).add(folder.id));
                  setCreatingUnderId(null);
                  setCreatingName('');
                }
                if (e.key === 'Escape') {
                  setCreatingUnderId(null);
                  setCreatingName('');
                }
              }}
              placeholder="Nova sub-pasta"
              className="w-28 md:w-full"
            />
          </div>
        )}
        {hasChildren && isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  const tree = buildTree(folders, null);

  return (
    <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto scrollbar-hide bg-surface border-b md:border-b-0 md:border-r border-surface-border md:w-[170px] md:shrink-0 md:py-2">
      <button
        onClick={() => onSelect(null)}
        className={`f-row shrink-0 md:shrink whitespace-nowrap md:whitespace-normal ${selectedFolderId === null ? 'active' : ''}`}
      >
        <span className="twirl" />
        <span className="name">Sem pasta</span>
      </button>
      {tree.map((node) => renderNode(node, 0))}
      <div className="f-new-row shrink-0 md:shrink" style={{ padding: 8 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              onCreate(newName.trim(), null);
              setNewName('');
            }
          }}
          placeholder="Nova pasta"
          className="w-28 md:w-full"
        />
      </div>
    </div>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M10 5v10M5 10h10" />
    </svg>
  );
}
function IconPin({ filled }: { filled: boolean }) {
  return filled ? (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <circle cx="10" cy="10" r="4" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="10" cy="10" r="4" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M5 5h10M8 5V3.6h4V5M6 5l.7 10.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L14 5" />
    </svg>
  );
}
