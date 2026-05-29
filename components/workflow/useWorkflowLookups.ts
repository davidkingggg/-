import { useState, useEffect } from 'react';
import { normalizeListResponse } from '@/lib/list-response';

export interface LookupOption {
  id: string;
  name: string;
}

export function useWorkflowLookups() {
  const [categories, setCategories] = useState<LookupOption[]>([]);
  const [suppliers, setSuppliers] = useState<LookupOption[]>([]);
  const [people, setPeople] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [catRes, supRes, peoRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/suppliers'),
          fetch('/api/people'),
        ]);

        if (catRes.ok) setCategories(normalizeListResponse<LookupOption>(await catRes.json()));
        if (supRes.ok) setSuppliers(normalizeListResponse<LookupOption>(await supRes.json()));
        if (peoRes.ok) setPeople(normalizeListResponse<LookupOption>(await peoRes.json()));
      } catch (error) {
        console.error('Failed to load lookups', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  return { categories, suppliers, people, loading };
}
