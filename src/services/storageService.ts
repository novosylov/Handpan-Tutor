import { GrooveProject } from '../types';

const STORAGE_KEY = 'handpan_grooves';

export const saveGroove = (groove: GrooveProject): void => {
  try {
    const existing = getSavedGrooves();
    const updated = [...existing, groove];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save groove:', error);
    throw new Error('Could not save groove to local storage.');
  }
};

export const getSavedGrooves = (): GrooveProject[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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
        // Basic validation
        if (!groove.sequence || !Array.isArray(groove.sequence) || groove.sequence.length !== 16) {
           throw new Error('Invalid groove format: Sequence must be 16 steps.');
        }
        resolve(groove);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
