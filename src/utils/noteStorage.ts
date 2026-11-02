import { Note } from '../types/task';

const NOTES_PREFIX = 'taskmaster_notes_';

/**
 * Loads notes from localStorage for a specific user
 */
export function loadLocalNotes(userId: string): Note[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${NOTES_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not read notes from localStorage:', e);
  }
  return [];
}

/**
 * Saves notes to localStorage for a specific user
 */
export function saveLocalNotes(userId: string, notes: Note[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${NOTES_PREFIX}${userId}`, JSON.stringify(notes));
  } catch (e) {
    console.warn('Could not save notes to localStorage:', e);
  }
}

/**
 * Filters notes according to tab and search query
 */
export function filterNotes(
  notes: Note[],
  query: string,
  filterMode: 'all' | 'pinned' | 'archived' | 'trash',
  activeLabel = 'all'
): Note[] {
  let list = notes || [];

  // Filter by state tab
  if (filterMode === 'trash') {
    list = list.filter((n) => n.isDeleted);
  } else {
    // Normal active or archived
    list = list.filter((n) => !n.isDeleted);
    if (filterMode === 'archived') {
      list = list.filter((n) => n.isArchived);
    } else if (filterMode === 'pinned') {
      list = list.filter((n) => !n.isArchived && n.isPinned);
    } else {
      // 'all': active unarchived notes
      list = list.filter((n) => !n.isArchived);
    }
  }

  // Filter by label
  if (activeLabel && activeLabel !== 'all') {
    list = list.filter((n) => Array.isArray(n.labels) && n.labels.includes(activeLabel));
  }

  // Filter by search query
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter((n) => {
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const contentMatch = (n.content || '').toLowerCase().includes(q);
      const checklistMatch = Array.isArray(n.checklistItems) && n.checklistItems.some((c) => (c.text || '').toLowerCase().includes(q));
      const labelMatch = Array.isArray(n.labels) && n.labels.some((l) => l.toLowerCase().includes(q));
      return titleMatch || contentMatch || checklistMatch || labelMatch;
    });
  }

  // Sort: Pinned first, then newest updated
  return list.sort((a, b) => {
    if (filterMode !== 'trash' && a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });
}

/**
 * Returns top recent or pinned notes for the dashboard overview
 */
export function getRecentDashboardNotes(notes: Note[], limit = 4): Note[] {
  const activeNotes = (notes || []).filter((n) => !n.isDeleted && !n.isArchived);
  return activeNotes
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    })
    .slice(0, limit);
}

const LABELS_STORAGE_KEY = 'taskmaster_labels_registry';
export const BASE_LABELS = ['Công việc', 'Ý tưởng', 'Cần xử lý', 'Tham khảo', 'Khẩn cấp', 'Cá nhân'];

/**
 * Loads all registered labels (defaults + user custom ones)
 */
export function loadAllLabels(): string[] {
  if (typeof window === 'undefined') return BASE_LABELS;
  try {
    const raw = localStorage.getItem(LABELS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return BASE_LABELS;
}

/**
 * Saves all registered labels
 */
export function saveAllLabels(labels: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(labels));
  } catch {}
}

/**
 * Calculates how many notes and tasks currently use or have used a specific label
 */
export function getLabelUsageCount(label: string, notes: Note[], tasks: any[] = []): number {
  if (!label) return 0;
  const clean = label.trim().toLowerCase();
  const notesCount = (notes || []).filter((n) =>
    Array.isArray(n.labels) && n.labels.some((l) => l.trim().toLowerCase() === clean)
  ).length;
  const tasksCount = (tasks || []).filter((t) =>
    Array.isArray(t.tags) && t.tags.some((tg: string) => tg.trim().toLowerCase() === clean)
  ).length;
  return notesCount + tasksCount;
}

/**
 * Deletes a label only if it is NOT used anywhere.
 * If used, returns failure with explanation.
 */
export function deleteLabelSafely(
  label: string,
  allLabels: string[],
  notes: Note[],
  tasks: any[] = []
): { success: boolean; updatedLabels: string[]; reason?: string } {
  const usage = getLabelUsageCount(label, notes, tasks);
  if (usage > 0) {
    return {
      success: false,
      updatedLabels: allLabels,
      reason: `Nhãn "${label}" đang được sử dụng trong ${usage} mục (ghi chú/nhiệm vụ). Không thể xóa khi đang được sử dụng!`,
    };
  }
  const next = allLabels.filter((l) => l.trim().toLowerCase() !== label.trim().toLowerCase());
  saveAllLabels(next);
  return {
    success: true,
    updatedLabels: next,
  };
}

