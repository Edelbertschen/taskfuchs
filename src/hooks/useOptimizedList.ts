import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { debounce, useThrottle } from '../utils/performance';

interface UseOptimizedListOptions<T> {
  items: T[];
  filterFn?: (item: T, query: string) => boolean;
  sortFn?: (a: T, b: T) => number;
  searchQuery?: string;
  pageSize?: number;
  enableVirtualization?: boolean;
  itemHeight?: number;
  enableThrottling?: boolean; // 🚀 Neues Feature
  enableCaching?: boolean;   // 🚀 Neues Feature
}

// 🚀 Performance: Cache für gefilterte Ergebnisse
const filterCache = new Map<string, any[]>();
const CACHE_LIMIT = 100;

export function useOptimizedList<T>({
  items,
  filterFn,
  sortFn,
  searchQuery = '',
  pageSize = 50,
  enableVirtualization = false,
  itemHeight = 60,
  enableThrottling = true,
  enableCaching = true
}: UseOptimizedListOptions<T>) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const searchQueryRef = useRef(searchQuery);
  const lastResultRef = useRef<T[]>([]);

  // 🔍 Performance Boost: Throttled search for heavy operations
  const throttledSearchQuery = useThrottle(searchQuery, enableThrottling ? 100 : 0);

  // Debounced search to avoid excessive filtering
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      searchQueryRef.current = query;
      setCurrentPage(0); // Reset to first page on search
    }, 300),
    []
  );

  useEffect(() => {
    if (throttledSearchQuery !== searchQueryRef.current) {
      debouncedSearch(throttledSearchQuery);
    }
  }, [throttledSearchQuery, debouncedSearch]);

  // 🚀 Performance: Memoized filtered and sorted items with caching
  const processedItems = useMemo(() => {
    setIsLoading(true);
    
    // Generate cache key
    const cacheKey = enableCaching ? 
      `${JSON.stringify(items.map(i => (i as any).id || i).slice(0, 10))}-${searchQueryRef.current}-${sortFn?.toString()}` : 
      null;
    
    // Check cache first
    if (enableCaching && cacheKey && filterCache.has(cacheKey)) {
      const cached = filterCache.get(cacheKey)!;
      setIsLoading(false);
      return cached;
    }
    
    let result = [...items];

    // Apply search filter
    if (searchQueryRef.current && filterFn) {
      result = result.filter(item => filterFn(item, searchQueryRef.current));
    }

    // Apply sorting
    if (sortFn) {
      result.sort(sortFn);
    }

    // Cache the result
    if (enableCaching && cacheKey) {
      // Limit cache size
      if (filterCache.size >= CACHE_LIMIT) {
        const firstKey = filterCache.keys().next().value;
        filterCache.delete(firstKey);
      }
      filterCache.set(cacheKey, result);
    }

    lastResultRef.current = result;
    setIsLoading(false);
    return result;
  }, [items, filterFn, sortFn, enableCaching]);

  // 🚀 Performance: Memoized paginated items
  const paginatedItems = useMemo(() => {
    if (!enableVirtualization) {
      const start = currentPage * pageSize;
      const end = start + pageSize;
      return processedItems.slice(start, end);
    }
    return processedItems;
  }, [processedItems, currentPage, pageSize, enableVirtualization]);

  // 🚀 Performance: Optimized load more function
  const loadMore = useCallback(() => {
    if ((currentPage + 1) * pageSize < processedItems.length) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, pageSize, processedItems.length]);

  // Check if more items available
  const hasMore = useMemo(() => {
    return (currentPage + 1) * pageSize < processedItems.length;
  }, [currentPage, pageSize, processedItems.length]);

  // 🚀 Performance: Enhanced virtual list calculations
  const virtualizedProps = useMemo(() => {
    if (!enableVirtualization) return null;

    return {
      totalHeight: processedItems.length * itemHeight,
      itemHeight,
      totalItems: processedItems.length,
      overscan: 5,
      estimatedItemSize: itemHeight
    };
  }, [enableVirtualization, processedItems.length, itemHeight]);

  // 🚀 Performance: Smart page reset 
  useEffect(() => {
    if (processedItems.length < (currentPage + 1) * pageSize) {
      setCurrentPage(0);
    }
  }, [processedItems.length, currentPage, pageSize]);

  // 🚀 Performance: Cleanup cache on unmount
  useEffect(() => {
    return () => {
      if (enableCaching) {
        // Keep only last few results to avoid memory leaks
        if (filterCache.size > 50) {
          filterCache.clear();
        }
      }
    };
  }, [enableCaching]);

  return {
    items: paginatedItems,
    totalItems: processedItems.length,
    filteredCount: processedItems.length,
    currentPage,
    hasMore,
    isLoading,
    loadMore,
    setCurrentPage,
    virtualizedProps,
    // 🚀 Neue Performance-Features
    clearCache: useCallback(() => {
      filterCache.clear();
    }, []),
    cacheSize: filterCache.size,
    lastProcessedCount: lastResultRef.current.length
  };
} 