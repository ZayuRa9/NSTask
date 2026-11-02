/**
 * Unit (department) and Priority color styling helper.
 * Provides distinct, accessible, and high-contrast color identities
 * to solve "trắng quá làm rối mắt, khó phân biệt" by color-coding
 * departments, priorities, and task urgency.
 */

export interface UnitColorStyle {
  badgeClass: string;
  dotClass: string;
  accentDot: string;
  borderClass: string;
  accentBg: string;
  label: string;
}

export function getUnitColorStyle(unitName: string): UnitColorStyle {
  const normalized = (unitName || '').trim().toLowerCase();

  if (normalized.includes('thanh niên') || normalized.includes('đoàn')) {
    return {
      badgeClass: 'bg-blue-100 text-blue-900 border border-blue-300 font-bold',
      dotClass: 'bg-blue-600',
      accentDot: 'bg-blue-600',
      borderClass: 'border-blue-400',
      accentBg: 'bg-blue-50/80',
      label: unitName || 'Ban Thanh Niên',
    };
  }

  if (normalized.includes('chi hội 1') || normalized.includes('chi hội')) {
    return {
      badgeClass: 'bg-teal-100 text-teal-900 border border-teal-300 font-bold',
      dotClass: 'bg-teal-600',
      accentDot: 'bg-teal-600',
      borderClass: 'border-teal-400',
      accentBg: 'bg-teal-50/80',
      label: unitName || 'Chi hội 1',
    };
  }

  if (normalized.includes('chuyên môn') || normalized.includes('văn phòng') || normalized.includes('hành chính')) {
    return {
      badgeClass: 'bg-purple-100 text-purple-900 border border-purple-300 font-bold',
      dotClass: 'bg-purple-600',
      accentDot: 'bg-purple-600',
      borderClass: 'border-purple-400',
      accentBg: 'bg-purple-50/80',
      label: unitName || 'Ban Chuyên Môn',
    };
  }

  if (normalized.includes('tuyên giáo') || normalized.includes('truyền thông')) {
    return {
      badgeClass: 'bg-amber-100 text-amber-950 border border-amber-300 font-bold',
      dotClass: 'bg-amber-600',
      accentDot: 'bg-amber-600',
      borderClass: 'border-amber-400',
      accentBg: 'bg-amber-50/80',
      label: unitName || 'Ban Tuyên Giáo',
    };
  }

  if (normalized.includes('kế toán') || normalized.includes('tài chính')) {
    return {
      badgeClass: 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold',
      dotClass: 'bg-emerald-600',
      accentDot: 'bg-emerald-600',
      borderClass: 'border-emerald-400',
      accentBg: 'bg-emerald-50/80',
      label: unitName || 'Phòng Kế Toán',
    };
  }

  if (normalized.includes('phong trào') || normalized.includes('thể thao')) {
    return {
      badgeClass: 'bg-rose-100 text-rose-950 border border-rose-300 font-bold',
      dotClass: 'bg-rose-600',
      accentDot: 'bg-rose-600',
      borderClass: 'border-rose-400',
      accentBg: 'bg-rose-50/80',
      label: unitName || 'Ban Phong Trào',
    };
  }

  // Deterministic palette fallback for any arbitrary unit
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const palettes = [
    {
      badgeClass: 'bg-sky-100 text-sky-900 border border-sky-300 font-bold',
      dotClass: 'bg-sky-600',
      accentDot: 'bg-sky-600',
      borderClass: 'border-sky-400',
      accentBg: 'bg-sky-50/80',
    },
    {
      badgeClass: 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold',
      dotClass: 'bg-indigo-600',
      accentDot: 'bg-indigo-600',
      borderClass: 'border-indigo-400',
      accentBg: 'bg-indigo-50/80',
    },
    {
      badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold',
      dotClass: 'bg-emerald-600',
      accentDot: 'bg-emerald-600',
      borderClass: 'border-emerald-400',
      accentBg: 'bg-emerald-50/80',
    },
    {
      badgeClass: 'bg-violet-100 text-violet-900 border border-violet-300 font-bold',
      dotClass: 'bg-violet-600',
      accentDot: 'bg-violet-600',
      borderClass: 'border-violet-400',
      accentBg: 'bg-violet-50/80',
    },
    {
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      dotClass: 'bg-amber-600',
      accentDot: 'bg-amber-600',
      borderClass: 'border-amber-400',
      accentBg: 'bg-amber-50/80',
    },
    {
      badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300 font-bold',
      dotClass: 'bg-rose-600',
      accentDot: 'bg-rose-600',
      borderClass: 'border-rose-400',
      accentBg: 'bg-rose-50/80',
    },
  ];

  const chosen = palettes[Math.abs(hash) % palettes.length];
  return {
    ...chosen,
    label: unitName || 'Đơn vị',
  };
}

/**
 * Returns distinct visual container style for a task card based on priority and status.
 */
export function getTaskCardColorStyle(priority: 'high' | 'medium' | 'low' = 'medium', isOverdue = false) {
  if (isOverdue) {
    return {
      cardClass: 'bg-gradient-to-r from-rose-50/90 via-rose-50/30 to-white border-2 border-rose-400 shadow-sm ring-1 ring-rose-500/20',
      accentBarClass: 'bg-rose-600',
      headerBg: 'bg-rose-50/50',
    };
  }

  if (priority === 'high') {
    return {
      cardClass: 'bg-gradient-to-r from-rose-50/70 via-amber-50/25 to-white border-2 border-rose-200/90 hover:border-rose-400 shadow-2xs hover:shadow-sm',
      accentBarClass: 'bg-rose-500',
      headerBg: 'bg-rose-50/30',
    };
  }

  if (priority === 'medium') {
    return {
      cardClass: 'bg-gradient-to-r from-amber-50/60 via-amber-50/15 to-white border-2 border-amber-200/90 hover:border-amber-400 shadow-2xs hover:shadow-sm',
      accentBarClass: 'bg-amber-500',
      headerBg: 'bg-amber-50/30',
    };
  }

  // Low / Normal
  return {
    cardClass: 'bg-gradient-to-r from-emerald-50/50 via-teal-50/15 to-white border-2 border-emerald-200/90 hover:border-emerald-400 shadow-2xs hover:shadow-sm',
    accentBarClass: 'bg-emerald-500',
    headerBg: 'bg-emerald-50/30',
  };
}
