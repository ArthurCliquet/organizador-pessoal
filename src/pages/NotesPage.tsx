import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Folder, Note } from '../types';
import {
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getFolderDeletionImpact,
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
  reorderFolders,
  reorderNotes,
} from '../features/notes/notesApi';
import { reorderWithinPinGroup } from '../features/notes/reorder';
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

interface FolderDeletionImpact {
  descendantFolderIds: string[];
  noteCount: number;
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
  const [deleteFolderImpact, setDeleteFolderImpact] = useState<FolderDeletionImpact | null>(null);
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [activeDrag, setActiveDrag] = useState<{ type: 'folder' | 'note'; id: string } | null>(null);

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
  const childFolders = selectedFolderId ? pinnedFirst(folders.filter((f) => f.parent_id === selectedFolderId)) : [];

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
    const note = notes.find((n) => n.id === id);
    if (note) setSelectedFolderId(note.folder_id ?? null);
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

  async function handleOpenDeleteFolderConfirm(id: string) {
    const folder = folders.find((f) => f.id === id) ?? null;
    if (!folder) return;
    try {
      const impact = await getFolderDeletionImpact(folders, id);
      setConfirmDeleteFolder(folder);
      setDeleteFolderImpact(impact);
    } catch {
      showError('Não foi possível calcular o impacto da exclusão.');
    }
  }

  async function handleDeleteFolder(id: string, impact: FolderDeletionImpact) {
    try {
      await deleteFolder(id);
      if (selectedFolderId === id || impact.descendantFolderIds.includes(selectedFolderId ?? '')) {
        setSelectedFolderId(null);
      }
      const deletedFolderIds = new Set([id, ...impact.descendantFolderIds]);
      const openNote = notes.find((n) => n.id === selectedNoteId);
      if (openNote && deletedFolderIds.has(openNote.folder_id ?? '')) {
        setSelectedNoteId(null);
      }
      loadFolders();
      loadNotes();
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const activeType = args.active.data.current?.type;
      const folderIds = new Set(folders.map((f) => f.id));
      if (activeType === 'folder') {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((c) => folderIds.has(String(c.id))),
        });
      }
      if (activeType === 'note') {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((c) => !folderIds.has(String(c.id))),
        });
      }
      return closestCenter(args);
    },
    [folders],
  );

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { type: 'folder' | 'note'; id: string } | undefined;
    if (data) setActiveDrag({ type: data.type, id: data.id });
  }

  async function handleReorderFolders(orderedIds: string[]) {
    const prev = folders;
    setFolders((cur) =>
      cur.map((f) => {
        const idx = orderedIds.indexOf(f.id);
        return idx === -1 ? f : { ...f, position: idx };
      }),
    );
    try {
      await reorderFolders(orderedIds);
      loadFolders();
    } catch {
      setFolders(prev);
      showError('Não foi possível reordenar as pastas.');
    }
  }

  async function handleReorderNotes(orderedIds: string[]) {
    const prev = notes;
    setNotes((cur) =>
      cur.map((n) => {
        const idx = orderedIds.indexOf(n.id);
        return idx === -1 ? n : { ...n, position: idx };
      }),
    );
    try {
      await reorderNotes(orderedIds);
      loadNotes();
    } catch {
      setNotes(prev);
      showError('Não foi possível reordenar as notas.');
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveDrag(null);
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;
    const type = e.active.data.current?.type;

    if (type === 'folder') {
      const a = folders.find((f) => f.id === activeId);
      const o = folders.find((f) => f.id === overId);
      if (!a || !o || (a.parent_id ?? null) !== (o.parent_id ?? null)) return;
      const group = sortedFolders.filter((f) => (f.parent_id ?? null) === (a.parent_id ?? null));
      const ordered = reorderWithinPinGroup(group, activeId, overId);
      if (ordered) await handleReorderFolders(ordered);
      return;
    }

    if (type === 'note') {
      const ordered = reorderWithinPinGroup(sortedNotes, activeId, overId);
      if (ordered) await handleReorderNotes(ordered);
    }
  }

  function handleDragCancel() {
    setActiveDrag(null);
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
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div
            className={`${selectedNoteId ? 'hidden' : 'flex'} md:flex flex-1 md:flex-none flex-col md:flex-row w-full md:w-auto min-h-0`}
          >
            <FolderList
              folders={sortedFolders}
              selectedFolderId={selectedFolderId}
              dndDisabled={!!trimmedQuery}
              onSelect={handleSelectFolder}
              onTogglePin={handleTogglePinFolder}
              onCreate={async (name, parentId) => {
                try {
                  await createFolder(name, parentId);
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
              onDelete={handleOpenDeleteFolderConfirm}
            />
            <div className="flex-1 min-h-0 md:flex-none md:w-56 md:shrink-0 md:border-r border-surface-border flex flex-col">
              <NoteList
                notes={sortedNotes}
                selectedNoteId={selectedNoteId}
                onSelect={handleSelectNote}
                onCreate={handleCreateNote}
                onDelete={(id) => setConfirmDeleteNote(notes.find((n) => n.id === id) ?? null)}
                onTogglePin={handleTogglePinNote}
                folders={trimmedQuery ? matchedFolders : childFolders}
                onSelectFolder={handleSelectFolder}
                emptyMessage={trimmedQuery ? 'Nenhum resultado encontrado' : 'Nenhuma nota aqui'}
              />
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDrag ? (
              <div className="drag-overlay-row">
                {activeDrag.type === 'folder'
                  ? folders.find((f) => f.id === activeDrag.id)?.name
                  : notes.find((n) => n.id === activeDrag.id)?.title || 'Sem título'}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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

      {confirmDeleteFolder && deleteFolderImpact && (
        <ConfirmDialog
          title="Excluir pasta"
          message={
            deleteFolderImpact.descendantFolderIds.length > 0 || deleteFolderImpact.noteCount > 0
              ? `Excluir "${confirmDeleteFolder.name}"? Isso apaga ${deleteFolderImpact.descendantFolderIds.length} sub-pasta(s) e ${deleteFolderImpact.noteCount} nota(s). Essa ação não pode ser desfeita.`
              : `Excluir "${confirmDeleteFolder.name}"? Essa ação não pode ser desfeita.`
          }
          onCancel={() => {
            setConfirmDeleteFolder(null);
            setDeleteFolderImpact(null);
          }}
          onConfirm={() => {
            handleDeleteFolder(confirmDeleteFolder.id, deleteFolderImpact);
            setConfirmDeleteFolder(null);
            setDeleteFolderImpact(null);
          }}
        />
      )}
    </div>
  );
}
