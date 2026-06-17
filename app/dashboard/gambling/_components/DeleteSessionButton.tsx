"use client";

import { useTransition } from "react";
import { deleteSession } from "@/app/dashboard/gambling/actions";

export default function DeleteSessionButton({ id }: { id: string }) {
  const [pending, run] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Deze sessie verwijderen?")) {
          run(() => deleteSession(id));
        }
      }}
      className="text-xs text-muted hover:text-red-400 disabled:opacity-40"
      aria-label="sessie verwijderen"
    >
      ✕
    </button>
  );
}
