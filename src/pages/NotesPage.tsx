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
  pinFolder,
  unpinFolder,
  pinNote,
  unpinNote,
  getPinnedNotes,
} from '../features/notes/notesApi';
import { FolderList } from '../features/notes/FolderList';
import { NoteList } from '../features/notes/NoteList';
import { NoteEditor } from '../features/notes/NoteEditor';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

function readStoredId(key: string): string | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

const PIN_LIMIT = 5;

function pinnedFirst<T extends { pinned_at: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (!!a.pinned_at !== !!b.pinned_at) return a.pinned_at ? -1 : 1;
    if (a.pinned_at && b.pinned_at) return b.pinned_at.localeCompare(a.pinned_at);
    return 0;
  });
}

export function NotesPage() {
  const { showError } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => readStoredId('notas:selectedFolderId'));
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => readStoredId('notas:selectedNoteId'));
  const [query, setQuery] = useState('');
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<Note | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<Folder | null>(null);
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);

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

  const loadPinnedNotes = useCallback(async () => {
    try {
      setPinnedNotes(await getPinnedNotes());
    } catch {
      showError('Não foi possível carregar as notas fixadas.');
    }
  }, [showError]);

  useEffect(() => {
    loadFolders();
    loadPinnedNotes();
  }, [loadFolders, loadPinnedNotes]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  const pinnedFolders = folders.filter((f) => f.pinned_at);
  const sortedFolders = pinnedFirst(folders);
  const sortedNotes = pinnedFirst(notes);
  const trimmedQuery = query.trim();
  const matchedFolders = trimmedQuery
    ? pinnedFirst(folders.filter((f) => f.name.toLowerCase().includes(trimmedQuery.toLowerCase())))
    : [];

  async function handleTogglePinFolder(folder: Folder) {
    try {
      if (folder.pinned_at) {
        await unpinFolder(folder.id);
      } else {
        if (pinnedFolders.length >= PIN_LIMIT) {
          showError(`Você já tem ${PIN_LIMIT} pastas fixadas. Desafixe uma antes de fixar outra.`);
          return;
        }
        await pinFolder(folder.id);
      }
      loadFolders();
    } catch {
      showError('Não foi possível atualizar a pasta fixada.');
    }
  }

  async function handleTogglePinNote(note: Note) {
    try {
      if (note.pinned_at) {
        await unpinNote(note.id);
      } else {
        if (pinnedNotes.length >= PIN_LIMIT) {
          showError(`Você já tem ${PIN_LIMIT} notas fixadas. Desafixe uma antes de fixar outra.`);
          return;
        }
        await pinNote(note.id);
      }
      loadNotes();
      loadPinnedNotes();
    } catch {
      showError('Não foi possível atualizar a nota fixada.');
    }
  }

  function handleSelectNote(id: string) {
    setSelectedNoteId(id);
    touchNoteViewed(id).catch(() => {});
  }

  function handleSelectFolder(id: string | null) {
    setSelectedFolderId(id);
    setSelectedNoteId(null);
    setQuery('');
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

  async function handleDeleteFolder(id: string) {
    try {
      await deleteFolder(id);
      if (selectedFolderId === id) setSelectedFolderId(null);
      loadFolders();
    } catch {
      showError('Não foi possível excluir a pasta.');
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
          placeholder="Buscar notas e pastas…"
          className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-sm text-app-text outline-none focus:border-primary"
        />
      </div>

      <div className="flex-1 min-h-0 border border-surface-border rounded overflow-hidden flex flex-col md:flex-row">
        <div
          className={`${selectedNoteId ? 'hidden' : 'flex'} md:flex flex-1 md:flex-none flex-col md:flex-row w-full md:w-auto min-h-0`}
        >
          <FolderList
            folders={sortedFolders}
            selectedFolderId={selectedFolderId}
            onSelect={handleSelectFolder}
            onTogglePin={handleTogglePinFolder}
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
            onDelete={(id) => setConfirmDeleteFolder(folders.find((f) => f.id === id) ?? null)}
          />
          <div className="flex-1 min-h-0 md:flex-none md:w-56 md:shrink-0 md:border-r border-surface-border flex flex-col">
            <NoteList
              notes={sortedNotes}
              selectedNoteId={selectedNoteId}
              onSelect={handleSelectNote}
              onCreate={handleCreateNote}
              onDelete={(id) => setConfirmDeleteNote(notes.find((n) => n.id === id) ?? null)}
              onTogglePin={handleTogglePinNote}
              folders={matchedFolders}
              onSelectFolder={handleSelectFolder}
              emptyMessage={trimmedQuery ? 'Nenhum resultado encontrado' : 'Nenhuma nota aqui'}
            />
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

      {confirmDeleteNote && (
        <ConfirmDialog
          title="Excluir nota"
          message={`Excluir "${confirmDeleteNote.title || 'Sem título'}"? Essa ação não pode ser desfeita.`}
          onCancel={() => setConfirmDeleteNote(null)}
          onConfirm={() => {
            handleDeleteNote(confirmDeleteNote.id);
            setConfirmDeleteNote(null);
          }}
        />
      )}

      {confirmDeleteFolder && (
        <ConfirmDialog
          title="Excluir pasta"
          message={`Excluir a pasta "${confirmDeleteFolder.name}"? As notas dela não serão apagadas, só ficarão sem pasta.`}
          onCancel={() => setConfirmDeleteFolder(null)}
          onConfirm={() => {
            handleDeleteFolder(confirmDeleteFolder.id);
            setConfirmDeleteFolder(null);
          }}
        />
      )}
    </div>
  );
}
