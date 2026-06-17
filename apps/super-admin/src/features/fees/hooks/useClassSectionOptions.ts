'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ClassOption {
  id: number;
  name: string;
}

export interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

export function useClassSectionOptions() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    setLoadingClasses(true);
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClasses(d.data);
      })
      .catch(() => {})
      .finally(() => setLoadingClasses(false));
  }, []);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSectionId('');
      return;
    }

    setLoadingSections(true);
    setSectionId('');
    fetch(`/api/sections?class_id=${classId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSections(d.data);
      })
      .catch(() => setSections([]))
      .finally(() => setLoadingSections(false));
  }, [classId]);

  const handleClassChange = useCallback((value: string) => {
    setClassId(value);
    setSectionId('');
  }, []);

  const clearFilters = useCallback(() => {
    setClassId('');
    setSectionId('');
  }, []);

  const hasActiveFilters = Boolean(classId || sectionId);

  return {
    classes,
    sections,
    classId,
    sectionId,
    setClassId: handleClassChange,
    setSectionId,
    clearFilters,
    hasActiveFilters,
    loadingClasses,
    loadingSections,
  };
}
