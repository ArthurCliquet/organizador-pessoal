import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../../types';
import { getRecentNotes } from '../notes/notesApi';
import { useToast } from '../../contexts/ToastContext';

export function RecentNotes() {
  const { showError } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    getRecentNotes(5)
      .then(setNotes)
      .catch(() => showError('Não foi possível carregar as notas recentes.'));
  }, [showError]);

  return (
    <div className="bg-surface border border-surface-border rounded p-5">
      <h3 className="font-display text-base mb-3">Notas recentes</h3>
      {notes.length === 0 && <p className="text-sm text-app-muted">Nenhuma nota ainda</p>}
      <div className="flex flex-col gap-1">
        {notes.map((note) => (
          <Link key={note.id} to="/notas" className="text-sm text-app-text hover:text-primary truncate">
            {note.title || 'Sem título'}
          </Link>
        ))}
      </div>
    </div>
  );
}
