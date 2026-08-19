import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { uploadNoteImage } from './noteImagesApi';
import { useToast } from '../../contexts/ToastContext';

interface NoteEditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  onSave: (fields: { title: string; content: string }) => void;
  onBack?: () => void;
}

function findPlaceholder(doc: ProseMirrorNode, marker: string): { from: number; to: number } | null {
  let result: { from: number; to: number } | null = null;
  doc.descendants((node, pos) => {
    if (result) return false;
    if (node.isText && node.text?.includes(marker)) {
      const index = node.text.indexOf(marker);
      result = { from: pos + index, to: pos + index + marker.length };
    }
    return true;
  });
  return result;
}

function insertUploadingImage(view: EditorView, file: File, showError: (message: string) => void) {
  const marker = `⏳enviando-imagem-${crypto.randomUUID()}⏳`;
  const { state } = view;
  view.dispatch(state.tr.insertText(marker, state.selection.from, state.selection.to));

  uploadNoteImage(file)
    .then((src) => {
      const pos = findPlaceholder(view.state.doc, marker);
      if (!pos) return;
      const node = view.state.schema.nodes.image.create({ src });
      view.dispatch(view.state.tr.replaceWith(pos.from, pos.to, node));
    })
    .catch(() => {
      const pos = findPlaceholder(view.state.doc, marker);
      if (pos) view.dispatch(view.state.tr.delete(pos.from, pos.to));
      showError('Não foi possível enviar a imagem.');
    });
}

export function NoteEditor({ noteId, initialTitle, initialContent, onSave, onBack }: NoteEditorProps) {
  const { showError } = useToast();
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Link.configure({ openOnClick: false, autolink: false }),
        Highlight,
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        Image,
      ],
      content: initialContent,
      onUpdate: () => scheduleSave(),
      editorProps: {
        handlePaste(view, event) {
          const items = Array.from(event.clipboardData?.items ?? []);
          const imageItem = items.find((item) => item.type.startsWith('image/'));
          if (!imageItem) return false;
          const file = imageItem.getAsFile();
          if (!file) return false;
          event.preventDefault();
          insertUploadingImage(view, file, showError);
          return true;
        },
        handleDrop(view, event) {
          const file = Array.from(event.dataTransfer?.files ?? []).find((f) => f.type.startsWith('image/'));
          if (!file) return false;
          event.preventDefault();
          insertUploadingImage(view, file, showError);
          return true;
        },
      },
    },
    [noteId],
  );

  useEffect(() => {
    if (titleRef.current) titleRef.current.value = initialTitle;
  }, [noteId, initialTitle]);

  function scheduleSave() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onSave({
        title: titleRef.current?.value ?? '',
        content: editor?.getHTML() ?? '',
      });
    }, 800);
  }

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }

  function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    insertUploadingImage(editor.view, file, showError);
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-surface-border">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden shrink-0 pl-4 pr-2 py-3 text-app-muted hover:text-app-text text-sm"
          >
            ← Voltar
          </button>
        )}
        <input
          ref={titleRef}
          defaultValue={initialTitle}
          onChange={scheduleSave}
          placeholder="Título"
          className="font-display flex-1 min-w-0 bg-transparent text-xl font-semibold text-app-text px-4 py-3 outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-surface-border">
        <ToolbarButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="H1" />
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" />
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" />
        <span className="w-px h-4 bg-surface-border mx-1" />
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="B" />
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="I" />
        <ToolbarButton active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} label="Destacar" />
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={() => {
            setLinkUrl(editor.getAttributes('link').href ?? '');
            setShowLinkInput((v) => !v);
          }}
          label="Link"
        />
        <span className="w-px h-4 bg-surface-border mx-1" />
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Citação" />
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Lista" />
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1,2,3" />
        <ToolbarButton
          active={editor.isActive('table')}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          label="Tabela"
        />
        <ToolbarButton active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divisor" />
        <ToolbarButton active={false} onClick={() => fileInputRef.current?.click()} label="Imagem" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChosen} className="hidden" />
      </div>
      {showLinkInput && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-border bg-surface-2">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyLink();
              if (e.key === 'Escape') setShowLinkInput(false);
            }}
            placeholder="https://…"
            className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-xs text-app-text outline-none"
          />
          <button type="button" onClick={applyLink} className="font-mono text-xs text-primary px-2 py-1">
            Aplicar
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setShowLinkInput(false);
              }}
              className="font-mono text-xs text-app-muted hover:text-danger px-2 py-1"
            >
              Remover
            </button>
          )}
        </div>
      )}
      {editor.isActive('table') && (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-surface-border bg-surface-2">
          <span className="font-mono text-[0.65rem] text-app-muted-2 mr-1">TABELA</span>
          <ToolbarButton active={false} onClick={() => editor.chain().focus().addRowAfter().run()} label="+ linha" />
          <ToolbarButton active={false} onClick={() => editor.chain().focus().addColumnAfter().run()} label="+ coluna" />
          <ToolbarButton active={false} onClick={() => editor.chain().focus().deleteRow().run()} label="− linha" />
          <ToolbarButton active={false} onClick={() => editor.chain().focus().deleteColumn().run()} label="− coluna" />
          <ToolbarButton active={false} onClick={() => editor.chain().focus().deleteTable().run()} label="Excluir tabela" />
        </div>
      )}
      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 text-app-text"
        onDragOver={(e) => e.preventDefault()}
      />
    </div>
  );
}

function ToolbarButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono px-2 py-1 rounded text-xs ${active ? 'bg-primary text-app-bg' : 'bg-surface text-app-muted hover:text-app-text'}`}
    >
      {label}
    </button>
  );
}
