export interface ShiftPreset {
  startTime: string;
  endTime: string;
}

export const SHIFT_PRESETS: Record<string, ShiftPreset> = {
  MORNING: { startTime: '09:00', endTime: '15:00' },
  AFTERNOON: { startTime: '15:00', endTime: '22:00' },
  NIGHT: { startTime: '22:00', endTime: '06:00' },
  OFF: { startTime: '', endTime: '' },
};

const STORAGE_KEY = 'shiftPresets';

export const getShiftPresets = (): Record<string, ShiftPreset> => {
  if (typeof window === 'undefined') return SHIFT_PRESETS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge con defaults por si falta algún tipo
      return { ...SHIFT_PRESETS, ...parsed };
    }
  } catch (error) {
    console.error('Error loading shift presets from localStorage:', error);
  }

  return SHIFT_PRESETS;
};

export const saveShiftPresets = (presets: Record<string, ShiftPreset>): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Error saving shift presets to localStorage:', error);
  }
};
