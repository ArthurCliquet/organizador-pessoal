import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../../types';
import { getRecentNotes } from '../notes/notesApi';
import { useToast } from '../../contexts/ToastContext';
import { formatRelativeDate } from '../../lib/relativeDate';

export function RecentNotes() {
  const { showError } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    getRecentNotes(5)
      .then(setNotes)
      .catch(() => showError('Não foi possível carregar as notas recentes.'));
  }, [showError]);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-4">Notas recentes</h2>
      {notes.length === 0 && <p className="text-sm text-app-muted">Nenhuma nota ainda</p>}
      <div className="flex flex-col">
        {notes.map((note, i) => (
          <Link
            key={note.id}
            to="/notas"
            style={{ '--stagger': i * 40 } as CSSProperties}
            className="list-row-in flex items-center justify-between gap-3 py-2.5 px-1.5 -mx-1.5 rounded-[10px] border-b border-surface-2 last:border-none transition-colors hover:bg-white/[0.025] hover:text-primary-bright"
          >
            <span className="text-sm text-app-text truncate">{note.title || 'Sem título'}</span>
            <span className="font-mono text-[0.65rem] text-app-muted-2 whitespace-nowrap">
              {formatRelativeDate(note.updated_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
