"use client";

// Saved (bookmarked) skills, persisted in localStorage — per-browser, no backend.
// Exposed as an external store via useSyncExternalStore so every bookmark button,
// the sidebar count, and the "Saved" view stay in sync (and it hydrates cleanly:
// the server snapshot is always empty, the client fills in after mount).

import { useSyncExternalStore } from "react";

const KEY = "superside:saved-skills";
const EMPTY: string[] = [];

// Cache the parsed array + the raw string it came from, so getSnapshot returns a
// STABLE reference when nothing changed (required by useSyncExternalStore).
let cache: string[] = EMPTY;
let cacheRaw: string | null | undefined;

function read(): string[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange(); // sync across tabs
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Add or remove a skill id from the saved set and notify all subscribers. */
export function toggleSavedSkill(id: string): void {
  if (typeof window === "undefined") return;
  const current = read();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  const raw = JSON.stringify(next);
  window.localStorage.setItem(KEY, raw);
  cache = next;
  cacheRaw = raw;
  listeners.forEach((l) => l());
}

/** Subscribe to the saved-skills set. Returns the ids + helpers. */
export function useSavedSkills(): {
  saved: string[];
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
} {
  const saved = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    saved,
    isSaved: (id: string) => saved.includes(id),
    toggle: toggleSavedSkill,
  };
}
