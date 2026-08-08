import { useState } from 'react';
import type { Folder } from '../../types';

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function FolderList({ folders, selectedFolderId, onSelect, onCreate, onRename, onDelete }: FolderListProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  return (
    <div className="flex flex-row md:flex-col gap-1 p-3 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-surface-border md:w-48 md:shrink-0">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 text-left px-3 py-1.5 rounded-lg text-sm ${selectedFolderId === null ? 'bg-primary text-app-bg' : 'text-app-muted hover:text-app-text'}`}
      >
        Sem pasta
      </button>
      {folders.map((folder) => (
        <div key={folder.id} className="group shrink-0 flex items-center gap-1">
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
              className="w-32 md:w-auto md:flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
            />
          ) : (
            <button
              onClick={() => onSelect(folder.id)}
              onDoubleClick={() => {
                setEditingId(folder.id);
                setEditingName(folder.name);
              }}
              className={`w-32 md:w-auto md:flex-1 text-left px-3 py-1.5 rounded-lg text-sm truncate ${selectedFolderId === folder.id ? 'bg-primary text-app-bg' : 'text-app-muted hover:text-app-text'}`}
            >
              {folder.name}
            </button>
          )}
          <button
            onClick={() => onDelete(folder.id)}
            className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-danger px-1 text-xs"
            title="Excluir pasta"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="shrink-0 flex gap-1 md:mt-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              onCreate(newName.trim());
              setNewName('');
            }
          }}
          placeholder="Nova pasta"
          className="w-28 md:w-auto md:flex-1 bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
