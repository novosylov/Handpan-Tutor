import { GrooveProject } from '../types';

const STORAGE_KEY = 'handpan_grooves';

export const saveGroove = (groove: GrooveProject): void => {
  try {
    const existing = getSavedGrooves();
    const safeGroove = {
      ...groove,
      id: groove.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `groove-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
    };
    // Replace if same ID already exists, or append
    const existingIndex = existing.findIndex(g => g.id === safeGroove.id);
    const updated = existingIndex >= 0 
      ? existing.map((g, idx) => idx === existingIndex ? safeGroove : g)
      : [...existing, safeGroove];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save groove:', error);
    throw new Error('Could not save groove to local storage.');
  }
};

export const getSavedGrooves = (): GrooveProject[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const list = JSON.parse(data);
    if (!Array.isArray(list)) return [];

    const seenIds = new Set<string>();
    let needsRewrite = false;

    const sanitized: GrooveProject[] = list.map((item, index) => {
      let id = item?.id;
      if (!id || typeof id !== 'string' || seenIds.has(id)) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `groove-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
        needsRewrite = true;
      }
      seenIds.add(id);

      return {
        ...item,
        id,
        name: item?.name || `Groove ${index + 1}`,
        createdAt: item?.createdAt || new Date().toISOString(),
        bpm: item?.bpm || 100,
        matrixVibe: item?.matrixVibe || 'straight',
        sequence: Array.isArray(item?.sequence) ? item.sequence : [],
      };
    });

    if (needsRewrite) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
  } catch (error) {
    console.error('Failed to load grooves:', error);
    return [];
  }
};

export const deleteGroove = (id: string): void => {
  try {
    const existing = getSavedGrooves();
    const updated = existing.filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete groove:', error);
  }
};

export const exportGrooveToFile = (groove: GrooveProject) => {
  const data = JSON.stringify(groove, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${groove.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importGrooveFromFile = (file: File): Promise<GrooveProject> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const groove = JSON.parse(json) as GrooveProject;
        // Basic validation: sequence must exist, be an array, and non-empty multiple of 16
        if (!groove.sequence || !Array.isArray(groove.sequence) || groove.sequence.length === 0 || groove.sequence.length % 16 !== 0) {
           throw new Error('Invalid groove format: Sequence must be a multiple of 16 steps.');
        }
        // Ensure imported groove has a brand-new unique ID
        groove.id = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `groove-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        resolve(groove);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
