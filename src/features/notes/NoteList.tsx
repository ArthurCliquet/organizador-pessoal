import type { Folder, Note } from '../../types';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (note: Note) => void;
  folders?: Folder[];
  onSelectFolder?: (id: string) => void;
  emptyMessage?: string;
}

function previewText(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 64 ? `${text.slice(0, 64)}…` : text;
}

export function NoteList({
  notes,
  selectedNoteId,
  onSelect,
  onCreate,
  onDelete,
  onTogglePin,
  folders = [],
  onSelectFolder,
  emptyMessage = 'Nenhuma nota aqui',
}: NoteListProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col">
      <div className="p-3">
        <button onClick={onCreate} className="note-new-btn">
          + Nova nota
        </button>
      </div>
      {folders.map((folder) => (
        <div key={`folder-${folder.id}`} className="sb-row" onClick={() => onSelectFolder?.(folder.id)}>
          <span className="tag-pasta shrink-0">PASTA</span>
          <span className="name truncate">{folder.name}</span>
        </div>
      ))}
      {notes.map((note) => {
        const preview = previewText(note.content);
        return (
          <div
            key={note.id}
            className={`sb-row group items-start ${selectedNoteId === note.id ? 'active' : ''}`}
            onClick={() => onSelect(note.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm text-app-text">{note.title || 'Sem título'}</div>
              {preview && <div className="truncate text-xs text-app-muted-2 mt-0.5">{preview}</div>}
            </div>
            <div className="n-actions opacity-100 md:opacity-0 md:group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(note);
                }}
                className={`n-pin ${note.pinned_at ? 'is-pinned' : ''}`}
                title={note.pinned_at ? 'Desafixar' : 'Fixar'}
              >
                {note.pinned_at ? 'fixada' : 'fixar'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note.id);
                }}
                className="n-del"
                title="Excluir nota"
              >
                <IconTrash />
              </button>
            </div>
          </div>
        );
      })}
      {notes.length === 0 && folders.length === 0 && <p className="text-center text-app-muted text-sm mt-4">{emptyMessage}</p>}
    </div>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M5 5h10M8 5V3.6h4V5M6 5l.7 10.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L14 5" />
    </svg>
  );
}
