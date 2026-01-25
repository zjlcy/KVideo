import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { TypeBadge } from '@/lib/types';

/**
 * Custom hook to automatically collect and track type badges from video results
 * 
 * Features:
 * - Auto-collects unique type_name values
 * - Tracks count per type
 * - Updates dynamically as videos are added/removed
 * - Removes badges when count reaches 0
 * - Supports filtering by selected types
 * - Persists state in URL
 */
export function useTypeBadges<T extends { type_name?: string }>(videos: T[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  // Initialize from URL
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => {
    const typesParam = searchParams.get('types');
    if (typesParam) {
      return new Set(typesParam.split(',').filter(Boolean));
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
    const typesParam = Array.from(selectedTypes).join(',');

    if (typesParam) {
      currentParams.set('types', typesParam);
    } else {
      currentParams.delete('types');
    }

    const newUrl = `${pathname}?${currentParams.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [selectedTypes, pathname, router, searchParams]);

  // Handle URL changes (e.g., when clicking browser back/forward)
  useEffect(() => {
    const typesParam = searchParams.get('types');
    const urlTypes = new Set(typesParam ? typesParam.split(',').filter(Boolean) : []);

    const currentTypesArr = Array.from(selectedTypes);
    const urlTypesArr = Array.from(urlTypes);

    if (currentTypesArr.length !== urlTypesArr.length ||
      !currentTypesArr.every(t => urlTypes.has(t))) {
      setSelectedTypes(urlTypes);
    }
  }, [searchParams]);

  // Collect and count type badges from videos
  const typeBadges = useMemo<TypeBadge[]>(() => {
    const typeMap = new Map<string, number>();

    videos.forEach(video => {
      if (video.type_name && video.type_name.trim()) {
        const type = video.type_name.trim();
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      }
    });

    // Convert to array and sort by count (descending)
    return Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [videos]);

  // Filter videos by selected types
  const filteredVideos = useMemo(() => {
    if (selectedTypes.size === 0) {
      return videos;
    }

    return videos.filter(video =>
      video.type_name && selectedTypes.has(video.type_name.trim())
    );
  }, [videos, selectedTypes]);

  // Toggle type selection - useCallback to prevent re-creation
  const toggleType = useCallback((type: string) => {
    // Update selected types immediately
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  // Auto-cleanup: remove selected types that no longer exist in badges
  useEffect(() => {
    if (typeBadges.length === 0) return;
    const availableTypes = new Set(typeBadges.map(b => b.type));

    setSelectedTypes(prev => {
      const filtered = new Set(
        Array.from(prev).filter(type => availableTypes.has(type))
      );

      // Only update if changed
      if (filtered.size !== prev.size) {
        return filtered;
      }
      return prev;
    });
  }, [typeBadges]);

  return {
    typeBadges,
    selectedTypes,
    filteredVideos,
    toggleType,
  };
}
