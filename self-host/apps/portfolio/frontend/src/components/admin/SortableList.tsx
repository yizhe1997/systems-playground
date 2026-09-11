'use client';
import { ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// Thin wrapper around dnd-kit so every admin list (companies, stack
// categories/skills, credits rows/items, bullets, schools...) shares one
// drag-reorder implementation instead of six near-identical DndContext
// setups. `layout` picks the matching sort strategy - "vertical" for a
// stacked list of rows, "grid" for wrapping chip layouts like TagList,
// where a dragged item can move to a different row, not just up/down.
export default function SortableList<T>({
  items,
  getId,
  onReorder,
  disabled,
  layout = 'vertical',
  children,
}: {
  items: T[];
  getId: (item: T, index: number) => string;
  onReorder: (next: T[]) => void;
  disabled?: boolean;
  layout?: 'vertical' | 'grid';
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = items.map((item, i) => getId(item, i));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  // Disabled (not admin) still needs the same DOM shape SortableItem
  // produces, so render through dnd-kit either way - useSortable itself
  // takes a `disabled` flag per item rather than skipping the whole tree.
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={disabled ? undefined : handleDragEnd}>
      <SortableContext items={ids} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

// One row/chip inside a SortableList. Only the drag handle (rendered via
// the render-prop) is draggable, not the whole row - the row still holds
// real inputs (text fields, selects) that need normal click/focus/type
// behavior, which a fully-draggable row would fight with.
export function SortableRow({
  id,
  disabled,
  className,
  children,
}: {
  id: string;
  disabled?: boolean;
  className?: string;
  children: (handle: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children({ attributes, listeners })}
    </div>
  );
}

export function DragHandle({
  attributes,
  listeners,
  disabled,
  label = 'Drag to reorder',
  className,
}: {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled}
      aria-label={label}
      className={
        className ||
        'shrink-0 cursor-grab active:cursor-grabbing touch-none text-[var(--ds-charcoal)]/40 hover:text-[var(--ds-charcoal)] disabled:opacity-20 disabled:cursor-not-allowed'
      }
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );
}
