"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function NotificationToggle() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    const ok =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setStandalone(isStandalone);

    if (ok) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(Boolean(sub)))
        .catch(() => {});
    }
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Je hebt geen toestemming gegeven voor meldingen.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setMsg("VAPID-sleutel ontbreekt (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sub.toJSON(), userAgent: navigator.userAgent }),
      });
      if (!res.ok) throw new Error("Opslaan van abonnement mislukt.");
      setSubscribed(true);
      setMsg("Meldingen staan aan ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("Meldingen staan uit.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      setMsg(res.ok ? `Testmelding verstuurd (${data.sent}).` : data.error);
    } catch {
      setMsg("Versturen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
        Dit toestel/browser ondersteunt geen web-push. Op iPhone werkt het alleen
        in de app die je <strong>op je beginscherm</strong> hebt gezet (iOS 16.4+).
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      {!standalone && (
        <p className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Zet de app eerst op je beginscherm (Safari → deelknop → “Zet op
          beginscherm”) en open ‘m van daaruit. Anders blokkeert iOS de meldingen.
        </p>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Push-meldingen</p>
          <p className="text-xs text-muted">
            {subscribed ? "Staan aan op dit toestel" : "Staan uit"}
          </p>
        </div>
        <button
          onClick={subscribed ? disable : enable}
          disabled={busy}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${
            subscribed
              ? "border border-border text-muted"
              : "bg-accent text-white"
          }`}
        >
          {subscribed ? "Uitzetten" : "Aanzetten"}
        </button>
      </div>

      {subscribed && (
        <button
          onClick={test}
          disabled={busy}
          className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm text-muted disabled:opacity-50"
        >
          Stuur een testmelding
        </button>
      )}

      {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}
    </div>
  );
}
