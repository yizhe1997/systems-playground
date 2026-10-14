"use client";

import { Menu } from "@base-ui/react/menu";
import { EllipsisVertical } from "lucide-react";

/**
 * One action of a row. A link (`href`), or a button that runs `onSelect`. A server-rendered list cannot pass a function,
 * so it hands `attrs` instead (the Trades list passes `data-delete`, which its one click handler reads).
 */
export type RowMenuItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
  attrs?: Record<string, string>;
};

/**
 * The kebab (three dots) of a row: its actions in a small menu, so a table with two or three actions per row stays tidy.
 * A row with one action keeps a plain button instead. `name` says what the actions are for, for assistive technology.
 */
export function RowMenu({ name, items }: { name: string; items: RowMenuItem[] }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="row-menu-trigger" aria-label={`Actions for ${name}`}>
        <EllipsisVertical size={18} strokeWidth={1.75} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="end" className="popup-positioner">
          <Menu.Popup className="popup row-menu" aria-label={`Actions for ${name}`}>
            {items.map((it) =>
              it.href ? (
                // a plain link: a list of many rows should not prefetch every edit page
                <Menu.LinkItem key={it.label} className="row-menu-item" href={it.href} closeOnClick {...it.attrs}>{it.label}</Menu.LinkItem>
              ) : (
                <Menu.Item key={it.label} className="row-menu-item" onClick={it.onSelect} {...it.attrs}>{it.label}</Menu.Item>
              ),
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
