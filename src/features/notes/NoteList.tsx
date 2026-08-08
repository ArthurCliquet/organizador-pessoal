import type { Note } from '../../types';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function previewText(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 64 ? `${text.slice(0, 64)}…` : text;
}

export function NoteList({ notes, selectedNoteId, onSelect, onCreate, onDelete }: NoteListProps) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <button onClick={onCreate} className="m-3 bg-primary text-app-bg text-sm rounded py-1.5 font-semibold">
        + Nova nota
      </button>
      {notes.map((note) => {
        const preview = previewText(note.content);
        return (
          <div
            key={note.id}
            className={`group flex items-start gap-1 px-4 py-2.5 border-b border-surface-2 cursor-pointer ${selectedNoteId === note.id ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
            onClick={() => onSelect(note.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm text-app-text">{note.title || 'Sem título'}</div>
              {preview && <div className="truncate text-xs text-app-muted-2 mt-0.5">{preview}</div>}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-danger text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        );
      })}
      {notes.length === 0 && <p className="text-center text-app-muted text-sm mt-4">Nenhuma nota aqui</p>}
    </div>
  );
}
