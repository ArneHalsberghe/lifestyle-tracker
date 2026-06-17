"use client";

import { useState, useTransition } from "react";
import { addJournalNote } from "./actions";

export default function AddNote() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, run] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-muted"
      >
        + Eigen notitie
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Wat wil je noteren?"
        className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
      />
      <div className="mt-2 flex gap-2">
        <button
          disabled={pending || !text.trim()}
          onClick={() =>
            run(async () => {
              await addJournalNote(text);
              setText("");
              setOpen(false);
            })
          }
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Bewaren
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted"
        >
          Annuleer
        </button>
      </div>
    </div>
  );
}
