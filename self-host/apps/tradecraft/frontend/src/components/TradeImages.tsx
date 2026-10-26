"use client";

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { ImageLimits, TradeImage } from "@/lib/types";
import { ALLOWED_TYPES, msgLimit, msgNotAdded, msgNotAllowed, msgTooBig } from "@/lib/imageLimits";
import { Dialog } from "@/components/Dialog";
import { ImageViewer } from "@/components/ImageViewer";

/** What the trade form needs from the section: store the images waiting for Save once the trade exists. */
export type TradeImagesHandle = {
  /** Uploads the images added before the trade was saved, one after another. Answers how many failed. */
  uploadPending: (tradeId: string) => Promise<number>;
  pendingCount: () => number;
};

type Pending = { key: string; file: File; url: string; pasted: boolean };

type Props = {
  /** Absent on a new trade: images then wait in the browser until the trade is saved. */
  tradeId?: string;
  initial: TradeImage[];
  limits: ImageLimits;
  /** Told whenever the number of waiting images changes (the form counts them as unsaved work). */
  onPending?: (n: number) => void;
  /** After a new trade was saved but some images were not stored (the spec's edge case). */
  notAdded?: number;
};

const accepted = (f: File) => (ALLOWED_TYPES as readonly string[]).includes(f.type);

/**
 * Screen C1: the Images section of the trade form. An image is added by pasting (Ctrl+V anywhere on the form), by
 * choosing a file, or by dropping one here. On a saved trade each image is stored at once; on a new trade it waits
 * for Save. The API judges the bytes: the checks here are only so the owner is told early and plainly.
 */
export const TradeImages = forwardRef<TradeImagesHandle, Props>(function TradeImages({ tradeId, initial, limits, onPending, notAdded }, ref) {
  const [items, setItems] = useState<TradeImage[]>(initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [message, setMessage] = useState<string | null>(notAdded ? msgNotAdded(notAdded) : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(0);
  const [removing, setRemoving] = useState<TradeImage | null>(null);
  const [over, setOver] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Pending[]>([]);
  pendingRef.current = pending;
  const uid = useId();

  useEffect(() => onPending?.(pending.length), [pending.length, onPending]);
  // blob pictures are given back when the section goes away
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const total = items.length + pending.length;

  const upload = useCallback(async (id: string, file: File, pasted: boolean): Promise<{ ok: true; image: TradeImage } | { ok: false; message: string }> => {
    try {
      // a pasted screenshot has no real name (Chrome calls it "image.png"): the journal names it by the time it was added
      const res = await fetch(`/api/trades/${id}/images${pasted || !file.name ? "" : `?name=${encodeURIComponent(file.name)}`}`, {
        method: "POST",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      const body = await res.json().catch(() => null);
      if (res.status === 401 && typeof window !== "undefined") window.location.assign("/sign-in?reason=ended");
      if (res.ok) return { ok: true, image: body as TradeImage };
      return { ok: false, message: body?.message ?? "The image was not added. Check your connection and try again." };
    } catch {
      return { ok: false, message: "The image was not added. Check your connection and try again." };
    }
  }, []);

  const addFiles = useCallback(
    async (files: File[], pasted = false) => {
      setNotice(null);
      setMessage(null);
      let count = total;
      for (const file of files) {
        if (!accepted(file)) return setMessage(msgNotAllowed);
        if (file.size > limits.maxBytes) return setMessage(msgTooBig(file.size, limits.maxBytes));
        if (count >= limits.maxCount) return setMessage(msgLimit(limits.maxCount));
        count += 1;
        if (!tradeId) {
          setPending((p) => [...p, { key: crypto.randomUUID(), file, url: URL.createObjectURL(file), pasted }]);
          continue;
        }
        setAdding((n) => n + 1);
        const r = await upload(tradeId, file, pasted);
        setAdding((n) => n - 1);
        if (!r.ok) return setMessage(r.message);
        setItems((list) => [...list, r.image]);
        setNotice("Image added.");
      }
    },
    [tradeId, total, limits, upload],
  );

  // Ctrl+V anywhere on the page while this form is open. An image on the clipboard is attached and no text is inserted;
  // plain text pastes as usual.
  const latest = useRef(addFiles);
  latest.current = addFiles;
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (document.querySelector("dialog[open]")) return; // a dialog is in front: it is not about this form
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      e.preventDefault();
      void latest.current(files, true);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      pendingCount: () => pendingRef.current.length,
      uploadPending: async (id: string) => {
        let failed = 0;
        for (const p of pendingRef.current) {
          const r = await upload(id, p.file, p.pasted);
          if (!r.ok) failed += 1;
          URL.revokeObjectURL(p.url);
        }
        setPending([]);
        return failed;
      },
    }),
    [upload],
  );

  const saveNote = async (img: TradeImage, note: string) => {
    if (note.trim() === img.note) return;
    const res = await fetch(`/api/images/${img.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ note }) }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (res?.ok) setItems((list) => list.map((i) => (i.id === img.id ? (body as TradeImage) : i)));
    else setMessage(body?.fields?.[0]?.message ?? body?.message ?? "The note was not saved. Check your connection and try again.");
  };

  const remove = async (img: TradeImage) => {
    setRemoving(null);
    const res = await fetch(`/api/images/${img.id}`, { method: "DELETE" }).catch(() => null);
    if (res && (res.ok || res.status === 404)) {
      setItems((list) => list.filter((i) => i.id !== img.id));
      setMessage(null);
      setNotice("Image removed.");
    } else {
      setMessage("The image was not removed. Check your connection and try again.");
    }
  };

  const full = total >= limits.maxCount;

  return (
    <section
      className="images"
      id="images"
      aria-labelledby={`${uid}-title`}
      onDragOver={(e) => {
        if (full) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length > 0) void addFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="images-head">
        <h2 className="section" id={`${uid}-title`}>Images</h2>
        {total > 0 && <span className="helper">{total} of {limits.maxCount} images</span>}
      </div>
      <p className="helper">Screenshots of the chart, for you to read when you judge this trade. PNG, JPEG or WebP, up to 5 MB each, up to {limits.maxCount} per trade.</p>

      {message && <p className="banner" role="alert"><span className="banner-title">! {message}</span></p>}
      {notice && <p className="helper" role="status">{notice}</p>}
      {!tradeId && pending.length > 0 && <p className="helper">Images added here are saved with the trade when you press Save trade.</p>}

      <div className={`drop-area${over ? " drop-over" : ""}${full ? " drop-off" : ""}`}>
        {full ? (
          <p>Adding is unavailable until you remove an image.</p>
        ) : (
          <>
            <p>Paste a screenshot (Ctrl+V), choose a file, or drop one here.</p>
            <input
              ref={input}
              type="file"
              className="sr-only"
              tabIndex={-1}
              accept={ALLOWED_TYPES.join(",")}
              multiple
              aria-label="Choose image files"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length > 0) void addFiles(files);
              }}
            />
            <button type="button" className="btn" onClick={() => input.current?.click()}>Choose a file</button>
            {adding > 0 && <span className="helper" role="status"> Adding…</span>}
          </>
        )}
      </div>

      {(items.length > 0 || pending.length > 0) && (
        <ul className="image-grid">
          {items.map((img) => (
            <li className="image-tile" key={img.id}>
              <button type="button" className="image-open" onClick={() => setViewing(items.indexOf(img))} aria-label={`View ${img.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a private same-origin picture, scaled by the browser */}
                <img className="image-thumb" src={`/api/images/${img.id}`} alt={img.note || img.name} loading="lazy" />
              </button>
              <strong className="image-name" title={img.name}>{img.name}</strong>
              <NoteField id={`${uid}-n-${img.id}`} image={img} max={limits.maxNoteChars} onSave={saveNote} />
              <div className="image-actions">
                <button type="button" className="btn-quiet" onClick={() => setRemoving(img)} aria-label={`Remove ${img.name}`}>Remove</button>
              </div>
            </li>
          ))}
          {pending.map((p) => (
            <li className="image-tile" key={p.key}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
              <img className="image-thumb" src={p.url} alt={p.file.name || "Screenshot waiting to be saved"} />
              <strong className="image-name">{p.pasted || !p.file.name ? "Screenshot" : p.file.name}</strong>
              <span className="helper">Waiting for Save</span>
              <div className="image-actions">
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => {
                    URL.revokeObjectURL(p.url);
                    setPending((list) => list.filter((x) => x.key !== p.key));
                  }}
                  aria-label={`Remove ${p.file.name || "the pasted screenshot"} before saving`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewing !== null && (
        <ImageViewer images={items} start={viewing} maxNote={limits.maxNoteChars} onChange={setItems} onClose={() => setViewing(null)} />
      )}

      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title="Remove this image?">
        {removing && (
          <>
            <p>&quot;{removing.name}&quot; will be deleted from the journal. It cannot be brought back.</p>
            <div className="form-actions">
              <button type="button" className="btn" autoFocus onClick={() => void remove(removing)}>Remove image</button>
              <button type="button" className="btn-quiet" onClick={() => setRemoving(null)}>Cancel</button>
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
});

/** The note under a picture: saved when the owner leaves the field. */
function NoteField({ id, image, max, onSave }: { id: string; image: TradeImage; max: number; onSave: (img: TradeImage, note: string) => void }) {
  const [v, setV] = useState(image.note);
  useEffect(() => setV(image.note), [image.note]);
  return (
    <div className="field">
      <label className="label" htmlFor={id}>Note (optional)</label>
      <input
        id={id}
        className="field-input"
        value={v}
        maxLength={max}
        placeholder="For example: Entry, 5 min chart"
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onSave(image, v)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // Enter in a note must not submit the trade form
            e.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}
