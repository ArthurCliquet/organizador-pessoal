export interface PinnedRow {
  id: string;
  pinned_at: string | null;
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/**
 * Reordena `activeId` para a posição de `overId` dentro de `items`, mantendo o
 * item no seu grupo de pin (fixados só entre fixados, não-fixados entre
 * não-fixados). `items` deve vir com os fixados primeiro. Retorna a nova ordem
 * de ids, ou `null` se nada muda / entrada inválida.
 */
export function reorderWithinPinGroup(
  items: PinnedRow[],
  activeId: string,
  overId: string,
): string[] | null {
  const oldIndex = items.findIndex((i) => i.id === activeId);
  const overIndex = items.findIndex((i) => i.id === overId);
  if (oldIndex === -1 || overIndex === -1 || oldIndex === overIndex) return null;

  const active = items[oldIndex];
  const firstUnpinned = items.findIndex((i) => !i.pinned_at);
  const pinnedCount = firstUnpinned === -1 ? items.length : firstUnpinned;

  let target = overIndex;
  if (active.pinned_at) target = Math.min(target, pinnedCount - 1);
  else target = Math.max(target, pinnedCount);
  if (target === oldIndex) return null;

  return move(items, oldIndex, target).map((i) => i.id);
}
