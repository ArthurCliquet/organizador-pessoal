import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageView } from './ResizableImageView';

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-width');
          return value ? Number(value) : null;
        },
        renderHTML: (attributes: { width: number | null }) => {
          if (!attributes.width) return {};
          return { 'data-width': attributes.width };
        },
      },
      cropX: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-crop-x');
          return value ? Number(value) : null;
        },
        renderHTML: (attributes: { cropX: number | null }) => {
          if (attributes.cropX == null) return {};
          return { 'data-crop-x': attributes.cropX };
        },
      },
      cropY: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-crop-y');
          return value ? Number(value) : null;
        },
        renderHTML: (attributes: { cropY: number | null }) => {
          if (attributes.cropY == null) return {};
          return { 'data-crop-y': attributes.cropY };
        },
      },
      cropW: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-crop-w');
          return value ? Number(value) : null;
        },
        renderHTML: (attributes: { cropW: number | null }) => {
          if (attributes.cropW == null) return {};
          return { 'data-crop-w': attributes.cropW };
        },
      },
      cropH: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-crop-h');
          return value ? Number(value) : null;
        },
        renderHTML: (attributes: { cropH: number | null }) => {
          if (attributes.cropH == null) return {};
          return { 'data-crop-h': attributes.cropH };
        },
      },
      naturalWidth: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-natural-width');
          return value ? Number(value) : null;
        },
        renderHTML: (attributes: { naturalWidth: number | null }) => {
          if (!attributes.naturalWidth) return {};
          return { 'data-natural-width': attributes.naturalWidth };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
