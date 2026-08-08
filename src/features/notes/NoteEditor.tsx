import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';

interface NoteEditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  onSave: (fields: { title: string; content: string }) => void;
  onBack?: () => void;
}

export function NoteEditor({ noteId, initialTitle, initialContent, onSave, onBack }: NoteEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: initialContent,
      onUpdate: () => scheduleSave(),
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
      <div className="flex gap-1 px-4 py-2 border-b border-surface-border">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="B" />
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="I" />
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Lista"
        />
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="1,2,3"
        />
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto px-4 py-3 text-app-text" />
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
