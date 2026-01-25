import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { SourceBadge } from '@/lib/types';

/**
 * Custom hook to manage source badge filtering
 * 
 * Features:
 * - Tracks available video sources
 * - Supports filtering by selected sources
 * - Auto-cleanup when sources no longer exist
 * - Persists state in URL
 */
export function useSourceBadges<T extends { source?: string; sourceName?: string }>(
  videos: T[],
  availableSources: SourceBadge[]
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  // Initialize from URL
  const [selectedSources, setSelectedSources] = useState<Set<string>>(() => {
    const sourcesParam = searchParams.get('sources');
    if (sourcesParam) {
      return new Set(sourcesParam.split(',').filter(Boolean));
    }
    return new Set();
  });

  // Sync state to URL
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const currentParams = new URLSearchParams(searchParams.toString());
    const sourcesParam = Array.from(selectedSources).join(',');

    if (sourcesParam) {
      currentParams.set('sources', sourcesParam);
    } else {
      currentParams.delete('sources');
    }

    const newUrl = `${pathname}?${currentParams.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [selectedSources, pathname, router, searchParams]);

  // Handle URL changes (e.g., when clicking browser back/forward)
  useEffect(() => {
    const sourcesParam = searchParams.get('sources');
    const urlSources = new Set(sourcesParam ? sourcesParam.split(',').filter(Boolean) : []);

    const currentSourcesArr = Array.from(selectedSources);
    const urlSourcesArr = Array.from(urlSources);

    if (currentSourcesArr.length !== urlSourcesArr.length ||
      !currentSourcesArr.every(s => urlSources.has(s))) {
      setSelectedSources(urlSources);
    }
  }, [searchParams]);

  // Filter videos by selected sources
  const filteredVideos = useMemo(() => {
    if (selectedSources.size === 0) {
      return videos;
    }

    return videos.filter(video =>
      video.source && selectedSources.has(video.source)
    );
  }, [videos, selectedSources]);

  // Toggle source selection
  const toggleSource = useCallback((sourceId: string) => {
    setSelectedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  }, []);

  // Auto-cleanup: remove selected sources that no longer exist
  useEffect(() => {
    if (availableSources.length === 0) return;
    const availableSourceIds = new Set(availableSources.map(s => s.id));

    setSelectedSources(prev => {
      const filtered = new Set(
        Array.from(prev).filter(sourceId => availableSourceIds.has(sourceId))
      );

      // Only update if changed
      if (filtered.size !== prev.size) {
        return filtered;
      }
      return prev;
    });
  }, [availableSources]);

  return {
    selectedSources,
    filteredVideos,
    toggleSource,
  };
}
