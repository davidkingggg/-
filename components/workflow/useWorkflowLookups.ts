import { useState, useEffect } from 'react';

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

        if (catRes.ok) setCategories(await catRes.json());
        if (supRes.ok) setSuppliers(await supRes.json());
        if (peoRes.ok) setPeople(await peoRes.json());
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
