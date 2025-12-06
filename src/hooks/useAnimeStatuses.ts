import { useSyncExternalStore } from 'react';

import type { AnimeStatus } from '@/types/anime';

const STORAGE_KEY = 'animeStatuses';

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
let cachedSnapshot: Map<string, AnimeStatus> | null = null;
let lastStorageValue: string | null = null;

function getSnapshot(): Map<string, AnimeStatus> {
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
    console.error('Failed to parse anime statuses:', error);
  }

  cachedSnapshot = new Map();
  return cachedSnapshot;
}

// Server snapshot (always returns the same empty Map instance to avoid infinite loop)
const emptyMap = new Map<string, AnimeStatus>();

function getServerSnapshot(): Map<string, AnimeStatus> {
  return emptyMap;
}

// Update localStorage and dispatch custom event
function setAnimeStatuses(statuses: Map<string, AnimeStatus>) {
  const statusObj = Object.fromEntries(statuses);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(statusObj));

  // Dispatch custom event for same-tab updates
  window.dispatchEvent(new Event('local-storage-change'));
}

export function useAnimeStatuses() {
  const statuses = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setStatus = (animeId: string, status: AnimeStatus | null) => {
    const next = new Map(statuses);
    if (status === null) {
      next.delete(animeId);
    } else {
      next.set(animeId, status);
    }
    setAnimeStatuses(next);
  };

  return { statuses, setStatus };
}
