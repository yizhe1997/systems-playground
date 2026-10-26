"use client";

import { useEffect, useState } from "react";
import type { TradeImage } from "@/lib/types";
import { Dialog } from "@/components/Dialog";

/**
 * Screen C2: one image large, with its note (editable), Previous/Next, Download and Remove. It makes its own calls, so the
 * trade form and the review drawer can both open it. `onChange` hands back the list after a note or a removal.
 */
export function ImageViewer({ images, start, maxNote, onChange, onClose }: { images: TradeImage[]; start: number; maxNote: number; onChange: (list: TradeImage[]) => void; onClose: () => void }) {
  const [list, setList] = useState(images);
  const [i, setI] = useState(Math.min(start, images.length - 1));
  const [note, setNote] = useState(images[i]?.note ?? "");
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const img = list[i];

  useEffect(() => setNote(img?.note ?? ""), [img?.id, img?.note]);

  // the arrow keys step through the pictures, except inside the note field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (asking || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") setI((n) => (n - 1 + list.length) % list.length);
      if (e.key === "ArrowRight") setI((n) => (n + 1) % list.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asking, list.length]);

  if (!img) return null;

  const update = (next: TradeImage[]) => {
    setList(next);
    onChange(next);
  };

  const saveNote = async () => {
    if (note.trim() === img.note) return;
    const res = await fetch(`/api/images/${img.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ note }) }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (res?.ok) {
      setMessage(null);
      update(list.map((x) => (x.id === img.id ? (body as TradeImage) : x)));
    } else {
      setMessage(body?.fields?.[0]?.message ?? body?.message ?? "The note was not saved. Check your connection and try again.");
    }
  };

  const remove = async () => {
    setAsking(false);
    const res = await fetch(`/api/images/${img.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !(res.ok || res.status === 404)) return setMessage("The image was not removed. Check your connection and try again.");
    const next = list.filter((x) => x.id !== img.id);
    update(next);
    if (next.length === 0) return onClose();
    setI((n) => Math.min(n, next.length - 1));
    setMessage("Image removed.");
  };

  const many = list.length > 1;
  return (
    <>
      <Dialog open={!asking} onClose={onClose} title={img.name}>
        <div className="viewer">
          {/* eslint-disable-next-line @next/next/no-img-element -- a private same-origin picture, fitted to the window by CSS */}
          <img className="viewer-img" src={`/api/images/${img.id}`} alt={img.note || img.name} />
        </div>
        {many && <p className="helper" role="status">Image {i + 1} of {list.length}</p>}
        <div className="field">
          <label className="label" htmlFor="viewer-note">Note (optional)</label>
          <input
            id="viewer-note"
            className="field-input"
            value={note}
            maxLength={maxNote}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
          <span className="helper">{maxNote} characters at most. Saved when you leave the field.</span>
        </div>
        {message && <p className="helper" role="status">{message}</p>}
        <div className="form-actions">
          {many && <button type="button" className="btn" onClick={() => setI((n) => (n - 1 + list.length) % list.length)}>Previous</button>}
          {many && <button type="button" className="btn" onClick={() => setI((n) => (n + 1) % list.length)}>Next</button>}
          <a className="btn" href={`/api/images/${img.id}?download=1`} download>Download</a>
          <button type="button" className="btn-quiet" onClick={() => setAsking(true)}>Remove</button>
          <span className="spacer" />
          <button type="button" className="btn-quiet" onClick={onClose}>Close</button>
        </div>
        <p className="helper">Esc closes.{many ? " Left and right arrows change image." : ""}</p>
      </Dialog>

      <Dialog open={asking} onClose={() => setAsking(false)} title="Remove this image?">
        <p>&quot;{img.name}&quot; will be deleted from the journal. It cannot be brought back.</p>
        <div className="form-actions">
          <button type="button" className="btn" autoFocus onClick={() => void remove()}>Remove image</button>
          <button type="button" className="btn-quiet" onClick={() => setAsking(false)}>Cancel</button>
        </div>
      </Dialog>
    </>
  );
}
