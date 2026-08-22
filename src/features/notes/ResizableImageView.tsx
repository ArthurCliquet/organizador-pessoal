import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

const MIN_WIDTH_PERCENT = 10;

type Corner = 'nw' | 'ne' | 'sw' | 'se';

interface ImageNodeAttrs {
  src: string;
  alt: string | null;
  width: number | null;
  cropX: number | null;
  cropY: number | null;
  cropW: number | null;
  cropH: number | null;
  naturalWidth: number | null;
}

export function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, width, cropX, cropY, cropW, cropH, naturalWidth } = node.attrs as ImageNodeAttrs;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);

  const isCropped = cropX != null && cropY != null && cropW != null && cropH != null && naturalWidth != null;
  const displayWidth = liveWidth ?? width;

  function handleResizeStart(corner: Corner, e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const box = wrapperRef.current;
    const container = box?.closest('.ProseMirror') as HTMLElement | null;
    if (!box || !container) return;

    const containerWidthPx = container.getBoundingClientRect().width;
    const startWidthPx = box.getBoundingClientRect().width;
    const startX = e.clientX;
    const sign = corner === 'ne' || corner === 'se' ? 1 : -1;
    const minPx = containerWidthPx * (MIN_WIDTH_PERCENT / 100);

    function onMove(ev: PointerEvent) {
      const deltaX = (ev.clientX - startX) * sign;
      const nextPx = Math.min(containerWidthPx, Math.max(minPx, startWidthPx + deltaX));
      setLiveWidth((nextPx / containerWidthPx) * 100);
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      setLiveWidth((current) => {
        if (current != null) updateAttributes({ width: current });
        return null;
      });
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  const wrapperStyle: CSSProperties = { width: displayWidth ? `${displayWidth}%` : undefined };
  const imgStyle: CSSProperties = {};
  if (isCropped) {
    wrapperStyle.aspectRatio = `${cropW} / ${cropH}`;
    imgStyle.position = 'absolute';
    imgStyle.left = `${-(cropX! / cropW!) * 100}%`;
    imgStyle.top = `${-(cropY! / cropH!) * 100}%`;
    imgStyle.width = `${(naturalWidth! / cropW!) * 100}%`;
    imgStyle.maxWidth = 'none';
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`img-resize-wrap${selected ? ' is-selected' : ''}${isCropped ? ' is-cropped' : ''}`}
      style={wrapperStyle}
    >
      <img src={src} alt={alt ?? ''} style={imgStyle} draggable={false} />
      {selected && (
        <>
          <span className="img-handle img-handle-nw" onPointerDown={(e) => handleResizeStart('nw', e)} />
          <span className="img-handle img-handle-ne" onPointerDown={(e) => handleResizeStart('ne', e)} />
          <span className="img-handle img-handle-sw" onPointerDown={(e) => handleResizeStart('sw', e)} />
          <span className="img-handle img-handle-se" onPointerDown={(e) => handleResizeStart('se', e)} />
        </>
      )}
    </NodeViewWrapper>
  );
}
