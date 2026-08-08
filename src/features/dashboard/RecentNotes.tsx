import { useEffect, useState } from 'react';
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
    <div>
      <h2 className="font-display text-base mb-3">Notas recentes</h2>
      {notes.length === 0 && <p className="text-sm text-app-muted">Nenhuma nota ainda</p>}
      <div className="flex flex-col gap-1">
        {notes.map((note) => (
          <Link
            key={note.id}
            to="/notas"
            className="flex items-center justify-between gap-3 py-1.5 border-b border-surface-2 last:border-none hover:text-primary"
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
