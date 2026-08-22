import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useToast } from '../../contexts/ToastContext';

interface CropRect {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

interface ImageCropModalProps {
  src: string;
  initialCrop: CropRect | null;
  onApply: (crop: CropRect & { naturalWidth: number }) => void;
  onCancel: () => void;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type DragState =
  | { type: 'move'; startX: number; startY: number; startRect: CropRect }
  | { type: 'resize'; handle: ResizeHandle; startX: number; startY: number; startRect: CropRect };

const MIN_CROP_PX = 24;
const HANDLES: ResizeHandle[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

export function ImageCropModal({ src, initialCrop, onApply, onCancel }: ImageCropModalProps) {
  const { showError } = useToast();
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [rect, setRect] = useState<CropRect | null>(null);

  function clampRect(r: CropRect, bounds: { width: number; height: number }): CropRect {
    const cropW = Math.min(Math.max(r.cropW, MIN_CROP_PX), bounds.width);
    const cropH = Math.min(Math.max(r.cropH, MIN_CROP_PX), bounds.height);
    const cropX = Math.min(Math.max(r.cropX, 0), bounds.width - cropW);
    const cropY = Math.min(Math.max(r.cropY, 0), bounds.height - cropH);
    return { cropX, cropY, cropW, cropH };
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const bounds = { width: img.naturalWidth, height: img.naturalHeight };
    setNatural(bounds);
    setRect(initialCrop ? clampRect(initialCrop, bounds) : { cropX: 0, cropY: 0, cropW: bounds.width, cropH: bounds.height });
  }

  function handleImageError() {
    showError('Não foi possível carregar a imagem para cortar.');
    onCancel();
  }

  function toDisplayStyle(r: CropRect): CSSProperties {
    if (!natural) return {};
    return {
      left: `${(r.cropX / natural.width) * 100}%`,
      top: `${(r.cropY / natural.height) * 100}%`,
      width: `${(r.cropW / natural.width) * 100}%`,
      height: `${(r.cropH / natural.height) * 100}%`,
    };
  }

  function onPointerMove(e: PointerEvent) {
    const drag = dragRef.current;
    const img = imgRef.current;
    if (!drag || !img || !natural) return;
    const renderedWidth = img.getBoundingClientRect().width;
    const scale = natural.width / renderedWidth;
    const dx = (e.clientX - drag.startX) * scale;
    const dy = (e.clientY - drag.startY) * scale;

    if (drag.type === 'move') {
      setRect(
        clampRect(
          { ...drag.startRect, cropX: drag.startRect.cropX + dx, cropY: drag.startRect.cropY + dy },
          natural,
        ),
      );
      return;
    }

    const { handle, startRect } = drag;
    const next = { ...startRect };
    if (handle.includes('e')) next.cropW = startRect.cropW + dx;
    if (handle.includes('s')) next.cropH = startRect.cropH + dy;
    if (handle.includes('w')) {
      next.cropX = startRect.cropX + dx;
      next.cropW = startRect.cropW - dx;
    }
    if (handle.includes('n')) {
      next.cropY = startRect.cropY + dy;
      next.cropH = startRect.cropH - dy;
    }
    setRect(clampRect(next, natural));
  }

  function onPointerUp() {
    dragRef.current = null;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  }

  function startMove(e: ReactPointerEvent) {
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { type: 'move', startX: e.clientX, startY: e.clientY, startRect: rect };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  function startResize(handle: ResizeHandle, e: ReactPointerEvent) {
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { type: 'resize', handle, startX: e.clientX, startY: e.clientY, startRect: rect };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-4 max-w-2xl w-full flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg text-app-text">Cortar imagem</h3>
        <div className="relative select-none">
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="block w-full h-auto"
            style={{ maxHeight: '65vh', objectFit: 'contain' }}
          />
          {rect && natural && (
            <div
              className="absolute border-2 border-primary cursor-move"
              style={{ ...toDisplayStyle(rect), boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
              onPointerDown={startMove}
            >
              {HANDLES.map((h) => (
                <span key={h} className={`crop-handle crop-handle-${h}`} onPointerDown={(e) => startResize(h, e)} />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onCancel} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!rect || !natural}
            onClick={() => {
              if (!rect || !natural) return;
              onApply({ ...clampRect(rect, natural), naturalWidth: natural.width });
            }}
            className="font-mono text-xs px-3 py-2 rounded bg-primary text-app-bg font-semibold disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
