import { useState } from 'react';
import type { Folder } from '../../types';

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (folder: Folder) => void;
}

export function FolderList({ folders, selectedFolderId, onSelect, onCreate, onRename, onDelete, onTogglePin }: FolderListProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  return (
    <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto scrollbar-hide bg-surface border-b md:border-b-0 md:border-r border-surface-border md:w-[150px] md:shrink-0">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 md:shrink text-left px-4 py-3 text-sm border-b border-surface-2 border-l-2 whitespace-nowrap md:whitespace-normal ${
          selectedFolderId === null ? 'text-app-text border-l-primary bg-surface-2 font-semibold' : 'text-app-muted border-l-transparent hover:text-app-text'
        }`}
      >
        Sem pasta
      </button>
      {folders.map((folder) => (
        <div key={folder.id} className="group shrink-0 md:shrink flex items-center border-b border-surface-2">
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
              className="w-32 md:w-auto md:flex-1 bg-app-bg border border-primary rounded m-1.5 px-2 py-1 text-sm text-app-text outline-none"
            />
          ) : (
            <button
              onClick={() => onSelect(folder.id)}
              onDoubleClick={() => {
                setEditingId(folder.id);
                setEditingName(folder.name);
              }}
              className={`w-32 md:w-auto md:flex-1 text-left px-4 py-3 text-sm truncate border-l-2 ${
                selectedFolderId === folder.id ? 'text-app-text border-l-primary bg-surface-2 font-semibold' : 'text-app-muted border-l-transparent hover:text-app-text'
              }`}
            >
              {folder.name}
            </button>
          )}
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
      ))}
      <div className="shrink-0 md:shrink p-2">
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
          className="w-28 md:w-full bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
