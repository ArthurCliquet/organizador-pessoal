import { useEffect, useState, useCallback } from 'react';
import type { Folder, Note } from '../types';
import {
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  touchNoteViewed,
} from '../features/notes/notesApi';
import { FolderList } from '../features/notes/FolderList';
import { NoteList } from '../features/notes/NoteList';
import { NoteEditor } from '../features/notes/NoteEditor';
import { useToast } from '../contexts/ToastContext';

function readStoredId(key: string): string | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

export function NotesPage() {
  const { showError } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => readStoredId('notas:selectedFolderId'));
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => readStoredId('notas:selectedNoteId'));
  const [query, setQuery] = useState('');

  useEffect(() => {
    sessionStorage.setItem('notas:selectedFolderId', JSON.stringify(selectedFolderId));
  }, [selectedFolderId]);

  useEffect(() => {
    sessionStorage.setItem('notas:selectedNoteId', JSON.stringify(selectedNoteId));
  }, [selectedNoteId]);

  const loadFolders = useCallback(async () => {
    try {
      setFolders(await getFolders());
    } catch {
      showError('Não foi possível carregar as pastas.');
    }
  }, [showError]);

  const loadNotes = useCallback(async () => {
    try {
      const result = query.trim() ? await searchNotes(query.trim()) : await getNotes(selectedFolderId);
      setNotes(result);
    } catch {
      showError('Não foi possível carregar as notas.');
    }
  }, [selectedFolderId, query, showError]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  function handleSelectNote(id: string) {
    setSelectedNoteId(id);
    touchNoteViewed(id).catch(() => {});
  }

  async function handleCreateNote() {
    try {
      const note = await createNote(selectedFolderId, 'Nova nota', '');
      setNotes((prev) => [note, ...prev]);
      handleSelectNote(note.id);
    } catch {
      showError('Não foi possível criar a nota.');
    }
  }

  async function handleDeleteNote(id: string) {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNoteId === id) setSelectedNoteId(null);
    } catch {
      showError('Não foi possível excluir a nota.');
    }
  }

  async function handleSaveNote(fields: { title: string; content: string }) {
    if (!selectedNoteId) return;
    try {
      await updateNote(selectedNoteId, fields);
      setNotes((prev) => prev.map((n) => (n.id === selectedNoteId ? { ...n, ...fields } : n)));
    } catch {
      showError('Não foi possível salvar a nota.');
    }
  }

  return (
    <div className="p-4 md:p-6 flex flex-col h-full min-h-[calc(100vh-57px)]">
      <div className="mb-4 max-w-xs">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar notas…"
          className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-sm text-app-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex-1 min-h-0 border border-surface-border rounded overflow-hidden flex flex-col md:flex-row">
        <div
          className={`${selectedNoteId ? 'hidden' : 'flex'} md:flex flex-1 md:flex-none flex-col md:flex-row w-full md:w-auto min-h-0`}
        >
          <FolderList
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelect={(id) => {
              setSelectedFolderId(id);
              setSelectedNoteId(null);
              setQuery('');
            }}
            onCreate={async (name) => {
              try {
                await createFolder(name);
                loadFolders();
              } catch {
                showError('Não foi possível criar a pasta.');
              }
            }}
            onRename={async (id, name) => {
              try {
                await renameFolder(id, name);
                loadFolders();
              } catch {
                showError('Não foi possível renomear a pasta.');
              }
            }}
            onDelete={async (id) => {
              try {
                await deleteFolder(id);
                if (selectedFolderId === id) setSelectedFolderId(null);
                loadFolders();
              } catch {
                showError('Não foi possível excluir a pasta.');
              }
            }}
          />
          <div className="flex-1 min-h-0 md:flex-none md:w-56 md:shrink-0 md:border-r border-surface-border flex flex-col">
            <NoteList notes={notes} selectedNoteId={selectedNoteId} onSelect={handleSelectNote} onCreate={handleCreateNote} onDelete={handleDeleteNote} />
          </div>
        </div>
        <div className={`${selectedNoteId ? 'block' : 'hidden'} md:block flex-1 min-w-0 bg-surface`}>
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              noteId={selectedNote.id}
              initialTitle={selectedNote.title}
              initialContent={selectedNote.content}
              onSave={handleSaveNote}
              onBack={() => setSelectedNoteId(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-app-muted text-sm">Selecione ou crie uma nota</div>
          )}
        </div>
      </div>
    </div>
  );
}
