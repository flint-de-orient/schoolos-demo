'use client';

import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  gradeCount?: number;
  studentCount?: number;
}

interface AcademicYearContextValue {
  years: AcademicYear[];
  viewingYear: AcademicYear | null;   // year the user is currently browsing
  dbCurrentYear: AcademicYear | null; // year with isCurrent=true in DB
  loading: boolean;
  setViewingYear: (year: AcademicYear) => void;
  setAsCurrentYear: (id: string) => Promise<void>;
  createYear: (data: Partial<AcademicYear>) => Promise<AcademicYear>;
  updateYear: (id: string, data: Partial<AcademicYear>) => Promise<void>;
  deleteYear: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextValue | null>(null);

const STORAGE_KEY = 'schoolos_viewing_year';

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [viewingYear, setViewingYearState] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchYears = useCallback(async () => {
    try {
      const res = await fetch('/api/academic-years');
      if (!res.ok) return;
      const data: AcademicYear[] = await res.json();
      setYears(data);

      // Determine which year to show:
      // 1. Previously stored viewing year (if still valid)
      // 2. DB current year
      // 3. Most recent year
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedYear = stored ? data.find((y) => y.id === stored) : null;
      const dbCurrent = data.find((y) => y.isCurrent);
      const fallback = data[0] ?? null;

      setViewingYearState(storedYear ?? dbCurrent ?? fallback);
    } catch {
      // silently fail — pages will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  const setViewingYear = useCallback((year: AcademicYear) => {
    setViewingYearState(year);
    localStorage.setItem(STORAGE_KEY, year.id);
  }, []);

  const setAsCurrentYear = useCallback(async (id: string) => {
    const res = await fetch(`/api/academic-years/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCurrent: true }),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: AcademicYear = await res.json();
    setYears((prev) =>
      prev.map((y) => ({ ...y, isCurrent: y.id === id }))
    );
    // Also switch view to that year
    setViewingYearState(updated);
    localStorage.setItem(STORAGE_KEY, updated.id);
  }, []);

  const createYear = useCallback(async (data: Partial<AcademicYear>) => {
    const res = await fetch('/api/academic-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? 'Failed to create');
    }
    const created: AcademicYear = await res.json();
    await fetchYears(); // refetch to get accurate counts
    return created;
  }, [fetchYears]);

  const updateYear = useCallback(async (id: string, data: Partial<AcademicYear>) => {
    const res = await fetch(`/api/academic-years/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? 'Failed to update');
    }
    await fetchYears();
  }, [fetchYears]);

  const deleteYear = useCallback(async (id: string) => {
    const res = await fetch(`/api/academic-years/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? 'Failed to delete');
    }
    setYears((prev) => prev.filter((y) => y.id !== id));
  }, []);

  const dbCurrentYear = years.find((y) => y.isCurrent) ?? null;

  return (
    <AcademicYearContext.Provider value={{
      years, viewingYear, dbCurrentYear, loading,
      setViewingYear, setAsCurrentYear,
      createYear, updateYear, deleteYear,
      refetch: fetchYears,
    }}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear(): AcademicYearContextValue {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error('useAcademicYear must be used inside AcademicYearProvider');
  return ctx;
}

export function useAcademicYearSafe(): AcademicYearContextValue | null {
  return useContext(AcademicYearContext);
}
