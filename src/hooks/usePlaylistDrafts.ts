import { useSyncExternalStore } from 'react';

import type { PlaylistDraft } from '@/types/playlist';

const STORAGE_KEY = 'playlistDrafts';

// Subscribe to localStorage changes
function subscribe(callback: () => void) {
  // Listen for storage events from other tabs
  window.addEventListener('storage', callback);

  // Listen for custom events from the same tab
  window.addEventListener('local-storage-change', callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('local-storage-change', callback);
  };
}

// Get current snapshot from localStorage (with caching to avoid infinite loop)
let cachedSnapshot: Map<string, PlaylistDraft> | null = null;
let lastStorageValue: string | null = null;

function getSnapshot(): Map<string, PlaylistDraft> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    // Return cached snapshot if storage hasn't changed
    if (stored === lastStorageValue && cachedSnapshot) {
      return cachedSnapshot;
    }

    lastStorageValue = stored;

    if (stored) {
      const parsed = JSON.parse(stored);
      cachedSnapshot = new Map(Object.entries(parsed));
      return cachedSnapshot;
    }
  } catch (error) {
    console.error('Failed to parse playlist drafts:', error);
  }

  cachedSnapshot = new Map();
  return cachedSnapshot;
}

// Server snapshot (always returns the same empty Map instance to avoid infinite loop)
const emptyMap = new Map<string, PlaylistDraft>();

function getServerSnapshot(): Map<string, PlaylistDraft> {
  return emptyMap;
}

// Update localStorage and dispatch custom event
function setPlaylistDrafts(drafts: Map<string, PlaylistDraft>) {
  const draftsObj = Object.fromEntries(drafts);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draftsObj));

  // Dispatch custom event for same-tab updates
  window.dispatchEvent(new Event('local-storage-change'));
}

export function usePlaylistDrafts() {
  const drafts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveDraft = (quarter: string, draft: PlaylistDraft) => {
    const next = new Map(drafts);
    next.set(quarter, {
      ...draft,
      updatedAt: new Date().toISOString(),
    });
    setPlaylistDrafts(next);
  };

  const getDraft = (quarter: string): PlaylistDraft | undefined => {
    return drafts.get(quarter);
  };

  const deleteDraft = (quarter: string) => {
    const next = new Map(drafts);
    next.delete(quarter);
    setPlaylistDrafts(next);
  };

  const getAllDrafts = (): PlaylistDraft[] => {
    return Array.from(drafts.values());
  };

  return { drafts, saveDraft, getDraft, deleteDraft, getAllDrafts };
}
