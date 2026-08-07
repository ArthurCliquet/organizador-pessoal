import type { Note } from '../../types';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function NoteList({ notes, selectedNoteId, onSelect, onCreate, onDelete }: NoteListProps) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <button onClick={onCreate} className="m-3 bg-primary text-white text-sm rounded-lg py-1.5 font-medium">
        + Nova nota
      </button>
      {notes.map((note) => (
        <div
          key={note.id}
          className={`group flex items-center gap-1 px-3 py-2 border-b border-surface-border cursor-pointer ${selectedNoteId === note.id ? 'bg-surface' : 'hover:bg-surface'}`}
          onClick={() => onSelect(note.id)}
        >
          <span className="flex-1 truncate text-sm text-app-text">{note.title || 'Sem título'}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-red-400 text-xs"
          >
            ✕
          </button>
        </div>
      ))}
      {notes.length === 0 && <p className="text-center text-app-muted text-sm mt-4">Nenhuma nota aqui</p>}
    </div>
  );
}
