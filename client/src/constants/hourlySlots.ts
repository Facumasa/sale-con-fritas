export interface HourlySlot {
  id: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export const DEFAULT_HOURLY_SLOTS: HourlySlot[] = [
  { id: 'slot-1', startTime: '12:00', endTime: '16:00' },
  { id: 'slot-2', startTime: '16:00', endTime: '20:00' },
  { id: 'slot-3', startTime: '20:00', endTime: '00:00' },
  { id: 'slot-4', startTime: '00:00', endTime: '04:00' },
];

const STORAGE_KEY = 'customHourlySlots';

/**
 * Obtener franjas horarias (personalizadas o predeterminadas)
 */
export const getHourlySlots = (): HourlySlot[] => {
  if (typeof window === 'undefined') return DEFAULT_HOURLY_SLOTS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validar que tenga la estructura correcta
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading hourly slots from localStorage:', error);
  }

  return DEFAULT_HOURLY_SLOTS;
};

/**
 * Guardar franjas horarias personalizadas
 */
export const saveHourlySlots = (slots: HourlySlot[]): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch (error) {
    console.error('Error saving hourly slots to localStorage:', error);
  }
};

/**
 * Restaurar franjas predeterminadas
 */
export const resetToDefaultSlots = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};
