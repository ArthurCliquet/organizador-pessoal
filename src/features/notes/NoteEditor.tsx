import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { ResizableImage } from './ResizableImage';
import type { Editor } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { uploadNoteImage } from './noteImagesApi';
import { useToast } from '../../contexts/ToastContext';

interface NoteEditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  onSave: (fields: { title: string; content: string }) => void;
  onBack?: () => void;
}

const PLACEHOLDER_PATTERN = /⏳enviando-imagem-[0-9a-fA-F-]+⏳/g;

function stripPlaceholders(html: string): string {
  return html.replace(PLACEHOLDER_PATTERN, '');
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

function insertUploadingImage(
  view: EditorView,
  file: File,
  showError: (message: string) => void,
  at?: { from: number; to: number },
) {
  const marker = `⏳enviando-imagem-${crypto.randomUUID()}⏳`;
  const { state } = view;
  const from = at?.from ?? state.selection.from;
  const to = at?.to ?? state.selection.to;
  view.dispatch(state.tr.insertText(marker, from, to));

  uploadNoteImage(file)
    .then((src) => {
      if (view.isDestroyed) return;
      const pos = findPlaceholder(view.state.doc, marker);
      if (!pos) return;
      const node = view.state.schema.nodes.image.create({ src });
      // Se o marcador é todo o conteúdo de um bloco (ex.: parágrafo criado ao
      // soltar a imagem entre blocos), substitui o bloco inteiro para não
      // sobrar um parágrafo vazio ao trocá-lo pela imagem.
      const $from = view.state.doc.resolve(pos.from);
      const wholeBlock = $from.parent.isTextblock && $from.parent.textContent === marker;
      const replaceFrom = wholeBlock ? $from.before() : pos.from;
      const replaceTo = wholeBlock ? $from.after() : pos.to;
      view.dispatch(view.state.tr.replaceWith(replaceFrom, replaceTo, node));
    })
    .catch(() => {
      if (!view.isDestroyed) {
        const pos = findPlaceholder(view.state.doc, marker);
        if (pos) view.dispatch(view.state.tr.delete(pos.from, pos.to));
      }
      showError('Não foi possível enviar a imagem.');
    });
}

export function NoteEditor({ noteId, initialTitle, initialContent, onSave, onBack }: NoteEditorProps) {
  const { showError } = useToast();
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        ResizableImage,
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
          const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          insertUploadingImage(
            view,
            file,
            showError,
            dropPos === undefined ? undefined : { from: dropPos, to: dropPos },
          );
          return true;
        },
      },
    },
    [noteId],
  );

  useEffect(() => {
    if (titleRef.current) titleRef.current.value = initialTitle;
  }, [noteId, initialTitle]);

  useEffect(() => {
    if (!drawerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (!drawerRef.current?.contains(e.target as Node)) setDrawerOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [drawerOpen]);

  function scheduleSave() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onSave({
        title: titleRef.current?.value ?? '',
        content: stripPlaceholders(editor?.getHTML() ?? ''),
      });
    }, 800);
  }

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url) {
      if (editor.state.selection.empty && !editor.isActive('link')) {
        editor
          .chain()
          .focus()
          .insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] })
          .run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }

  function openLinkInput() {
    if (!editor) return;
    setLinkUrl(editor.getAttributes('link').href ?? '');
    setShowLinkInput((v) => !v);
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

      {/* the tray */}
      <div className="tray border-b border-surface-border">
        <div className="tray-unit">
          <div className="tray-unit-label">Texto</div>
          <div className="groove">
            <Key tip="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              H1
            </Key>
            <Key tip="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              H2
            </Key>
            <Key tip="Título 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              H3
            </Key>
          </div>
        </div>

        <div className="tray-unit">
          <div className="tray-unit-label">Marcas</div>
          <div className="groove">
            <Key tip="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <IconBold />
            </Key>
            <Key tip="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <IconItalic />
            </Key>
            <Key tip="Destacar" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
              <IconHighlight />
            </Key>
            <Key tip="Link" active={editor.isActive('link')} onClick={openLinkInput}>
              <IconLink />
            </Key>
          </div>
        </div>

        <div className="tray-unit">
          <div className="tray-unit-label">Estrutura</div>
          <div className="groove">
            <Key tip="Citação" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <IconQuote />
            </Key>
            <Key tip="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <IconBulletList />
            </Key>
            <Key tip="Numerada" wide active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              1.2.3
            </Key>
          </div>
        </div>

        <span className="tray-divider" />

        <div className="tray-unit" ref={drawerRef}>
          <div className="tray-unit-label bare">Mais</div>
          <div className="drawer-wrap">
            <button type="button" className="key key-insert" data-tip="Inserir" onClick={() => setDrawerOpen((v) => !v)}>
              <IconPlus />
            </button>
            {drawerOpen && (
              <div className="drawer">
                <button
                  type="button"
                  className="drawer-item"
                  onClick={() => {
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    setDrawerOpen(false);
                  }}
                >
                  <IconTable />
                  Tabela
                </button>
                <button
                  type="button"
                  className="drawer-item"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setDrawerOpen(false);
                  }}
                >
                  <IconImage />
                  Imagem
                </button>
                <button
                  type="button"
                  className="drawer-item"
                  onClick={() => {
                    editor.chain().focus().setHorizontalRule().run();
                    setDrawerOpen(false);
                  }}
                >
                  <IconRule />
                  Divisor
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChosen} className="hidden" />
          </div>
        </div>
      </div>

      {/* Wrapper stays mounted even when empty: BubbleMenu (below) uses tippy.js
          to move its DOM node outside React's normal child order, so a sibling
          that mounts/unmounts directly next to it makes React's reconciler try
          to insertBefore a reference node tippy already relocated, crashing the
          whole tree. Keeping this wrapper always-present isolates that churn. */}
      <div>
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
      </div>

      <BubbleMenu editor={editor} className="bubble" shouldShow={() => !editor.state.selection.empty && !editor.isActive('image')}>
        <Key active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <IconBold />
        </Key>
        <Key active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <IconItalic />
        </Key>
        <Key active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <IconHighlight />
        </Key>
        <Key active={editor.isActive('link')} onClick={openLinkInput}>
          <IconLink />
        </Key>
      </BubbleMenu>

      <div>{editor.isActive('table') && <TableContextStrip editor={editor} />}</div>

      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 text-app-text"
        onDragOver={(e) => e.preventDefault()}
      />
    </div>
  );
}

function TableContextStrip({ editor }: { editor: Editor }) {
  return (
    <div className="px-4 py-1.5 border-b border-surface-border bg-surface-2">
      <div className="ctx-strip">
        <span className="ctx-label">
          <IconGrid />
          Tabela
        </span>
        <span className="tray-divider" style={{ height: 22 }} />
        <Key tip="+ linha" onClick={() => editor.chain().focus().addRowAfter().run()}>
          <IconRowPlus />
        </Key>
        <Key tip="+ coluna" onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <IconColumnPlus />
        </Key>
        <Key tip="− linha" onClick={() => editor.chain().focus().deleteRow().run()}>
          <IconRowMinus />
        </Key>
        <Key tip="− coluna" onClick={() => editor.chain().focus().deleteColumn().run()}>
          <IconColumnMinus />
        </Key>
        <Key tip="Excluir tabela" onClick={() => editor.chain().focus().deleteTable().run()}>
          <IconTrash />
        </Key>
      </div>
    </div>
  );
}

function Key({
  active,
  wide,
  tip,
  onClick,
  children,
}: {
  active?: boolean;
  wide?: boolean;
  tip?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tip={tip}
      className={`key${active ? ' is-on' : ''}${wide ? ' key-wide' : ''}`}
    >
      {children}
    </button>
  );
}

function IconBold() {
  return <span className="glyph-b">B</span>;
}
function IconItalic() {
  return <span className="glyph-i">I</span>;
}
function IconHighlight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.8 3.6 3.6 3.6-7 7-4.4.8.8-4.4 7-7Z" />
      <path d="M3.5 17.5h5" strokeWidth={2.4} />
    </svg>
  );
}
function IconLink() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.7 12.3a3.4 3.4 0 0 0 4.9.2l2.3-2.3a3.4 3.4 0 0 0-4.8-4.8L9 6.5" />
      <path d="M12.3 7.7a3.4 3.4 0 0 0-4.9-.2l-2.3 2.3a3.4 3.4 0 0 0 4.8 4.8l1.1-1.1" />
    </svg>
  );
}
function IconQuote() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 4v12M8 6h8M8 10h8M8 14h5" />
    </svg>
  );
}
function IconBulletList() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" stroke="none">
      <circle cx="4.3" cy="5.5" r="1.3" />
      <circle cx="4.3" cy="10" r="1.3" />
      <circle cx="4.3" cy="14.5" r="1.3" />
      <rect x="7.5" y="4.6" width="8" height="1.7" rx=".8" />
      <rect x="7.5" y="9.1" width="8" height="1.7" rx=".8" />
      <rect x="7.5" y="13.6" width="8" height="1.7" rx=".8" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}
function IconTable() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3.5" y="3.5" width="13" height="13" rx="1.5" />
      <path d="M3.5 8.5h13M8.5 3.5v13" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <circle cx="7.3" cy="8" r="1.2" />
      <path d="m4 14 3.7-3.7a1.5 1.5 0 0 1 2.1 0L14 14M12.5 12.5l1.2-1.2a1.5 1.5 0 0 1 2.1 0L17 13" />
    </svg>
  );
}
function IconRule() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M4 10h12" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="3" y="3" width="14" height="14" rx="1.5" />
      <path d="M3 8.5h14M8.5 3v14" />
    </svg>
  );
}
function IconRowPlus() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M4 6.5h12M4 13.5h12" />
      <path d="M10 8.5v3M8.5 10h3" />
    </svg>
  );
}
function IconColumnPlus() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M6.5 4v12M13.5 4v12" />
      <path d="M8.5 10h3M10 8.5v3" />
    </svg>
  );
}
function IconRowMinus() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M4 6.5h12M4 13.5h12" />
      <path d="M8.5 10h3" />
    </svg>
  );
}
function IconColumnMinus() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M6.5 4v12M13.5 4v12" />
      <path d="M8.5 10h3" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M5 5h10M8 5V3.6h4V5M6 5l.7 10.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L14 5" />
    </svg>
  );
}
