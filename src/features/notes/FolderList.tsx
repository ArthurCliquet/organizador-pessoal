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
        <div className="group flex items-center border-b border-surface-2">
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(folder.id)}
              className="shrink-0 w-5 text-app-muted-2 hover:text-app-text text-xs"
              style={{ marginLeft: `${depth * 12}px` }}
              title={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="shrink-0 w-5" style={{ marginLeft: `${depth * 12}px` }} />
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
              className="w-28 md:w-auto md:flex-1 bg-app-bg border border-primary rounded m-1.5 px-2 py-1 text-sm text-app-text outline-none"
            />
          ) : (
            <button
              onClick={() => onSelect(folder.id)}
              onDoubleClick={() => {
                setEditingId(folder.id);
                setEditingName(folder.name);
              }}
              className={`w-28 md:w-auto md:flex-1 text-left px-2 py-3 text-sm truncate border-l-2 ${
                selectedFolderId === folder.id ? 'text-app-text border-l-primary bg-surface-2 font-semibold' : 'text-app-muted border-l-transparent hover:text-app-text'
              }`}
            >
              {folder.name}
            </button>
          )}
          <button
            onClick={() => setCreatingUnderId(folder.id)}
            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-primary px-1.5 text-xs"
            title="Nova sub-pasta"
          >
            +
          </button>
          <button
            onClick={() => onTogglePin(folder)}
            className={`shrink-0 px-1.5 flex items-center justify-center ${
              folder.pinned_at ? '' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
            }`}
            title={folder.pinned_at ? 'Desafixar' : 'Fixar'}
          >
            <span className={`w-1.5 h-1.5 rounded-full block ${folder.pinned_at ? 'bg-primary' : 'border border-app-muted'}`} />
          </button>
          <button
            onClick={() => onDelete(folder.id)}
            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-danger px-2.5 py-1 text-xs"
            title="Excluir pasta"
          >
            ✕
          </button>
        </div>
        {creatingUnderId === folder.id && (
          <div className="p-2" style={{ paddingLeft: `${depth * 12 + 28}px` }}>
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
              className="w-28 md:w-full bg-app-bg border border-primary rounded px-2 py-1 text-xs text-app-text outline-none"
            />
          </div>
        )}
        {hasChildren && isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  const tree = buildTree(folders, null);

  return (
    <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto scrollbar-hide bg-surface border-b md:border-b-0 md:border-r border-surface-border md:w-[170px] md:shrink-0">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 md:shrink text-left px-4 py-3 text-sm border-b border-surface-2 border-l-2 whitespace-nowrap md:whitespace-normal ${
          selectedFolderId === null ? 'text-app-text border-l-primary bg-surface-2 font-semibold' : 'text-app-muted border-l-transparent hover:text-app-text'
        }`}
      >
        Sem pasta
      </button>
      {tree.map((node) => renderNode(node, 0))}
      <div className="shrink-0 md:shrink p-2">
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
          className="w-28 md:w-full bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
