/**
 * Active Application Usage Tracker
 * Only counts when the web app/software is actively opened and visible.
 * Formats time with smart flexible unit conversion (phút, giờ, ngày) rounded to 1 decimal place.
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY_USAGE_SECONDS = 'taskmaster_active_usage_seconds_';
const STORAGE_KEY_SESSION_SECONDS = 'taskmaster_session_usage_seconds_';
const STORAGE_KEY_TODAY_SECONDS = 'taskmaster_today_usage_seconds_';
const STORAGE_KEY_TODAY_DATE = 'taskmaster_today_usage_date_';

export interface SmartDurationResult {
  value: string;
  unit: string;
  full: string;
  rawMinutes: number;
}

/**
 * Smart duration formatting with 1 decimal place ("làm tròn hàng chục sau dấu phẩy"):
 * - Dưới 60 phút: tính theo phút (vd: "45.2 phút", "15.0 phút")
 * - Đủ 60 phút đến dưới 24 giờ (1440 phút): chuyển sang giờ (vd: "1.5 giờ", "8.2 giờ")
 * - Đủ 24 giờ trở lên: chuyển sang ngày (vd: "1.2 ngày", "3.5 ngày")
 */
export function formatSmartDuration(totalMinutes: number): SmartDurationResult {
  const safeMinutes = Math.max(0, isNaN(totalMinutes) ? 0 : totalMinutes);

  if (safeMinutes < 60) {
    const val = safeMinutes.toFixed(1);
    return {
      value: val,
      unit: 'phút',
      full: `${val} phút`,
      rawMinutes: safeMinutes,
    };
  } else if (safeMinutes < 1440) {
    const hours = safeMinutes / 60;
    const val = hours.toFixed(1);
    return {
      value: val,
      unit: 'giờ',
      full: `${val} giờ`,
      rawMinutes: safeMinutes,
    };
  } else {
    const days = safeMinutes / 1440;
    const val = days.toFixed(1);
    return {
      value: val,
      unit: 'ngày',
      full: `${val} ngày`,
      rawMinutes: safeMinutes,
    };
  }
}

/**
 * Converts seconds to smart duration object
 */
export function formatSmartDurationFromSeconds(seconds: number): SmartDurationResult {
  return formatSmartDuration(seconds / 60);
}

/**
 * Loads total active software usage in seconds
 */
export function loadActiveUsageSeconds(userId = 'default'): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(`${STORAGE_KEY_USAGE_SECONDS}${userId}`);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Saves total active usage in seconds
 */
export function saveActiveUsageSeconds(seconds: number, userId = 'default'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_USAGE_SECONDS}${userId}`, String(seconds));
  } catch {}
}

/**
 * Loads today's active software usage in seconds (resets if new day)
 */
export function loadTodayActiveUsageSeconds(userId = 'default'): number {
  if (typeof window === 'undefined') return 0;
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const savedDate = localStorage.getItem(`${STORAGE_KEY_TODAY_DATE}${userId}`);
    if (savedDate !== todayStr) {
      localStorage.setItem(`${STORAGE_KEY_TODAY_DATE}${userId}`, todayStr);
      localStorage.setItem(`${STORAGE_KEY_TODAY_SECONDS}${userId}`, '0');
      return 0;
    }
    const val = localStorage.getItem(`${STORAGE_KEY_TODAY_SECONDS}${userId}`);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Saves today's active software usage in seconds
 */
export function saveTodayActiveUsageSeconds(seconds: number, userId = 'default'): void {
  if (typeof window === 'undefined') return;
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`${STORAGE_KEY_TODAY_DATE}${userId}`, todayStr);
    localStorage.setItem(`${STORAGE_KEY_TODAY_SECONDS}${userId}`, String(seconds));
  } catch {}
}

/**
 * React Hook for tracking active web/software usage
 * Only increments when the tab/window is actively opened and visible.
 */
export function useActiveUsageTracker(userId = 'default') {
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [todaySeconds, setTodaySeconds] = useState<number>(() => loadTodayActiveUsageSeconds(userId));
  const [totalSeconds, setTotalSeconds] = useState<number>(() => loadActiveUsageSeconds(userId));

  useEffect(() => {
    // Sync initial from storage if user changes
    setTodaySeconds(loadTodayActiveUsageSeconds(userId));
    setTotalSeconds(loadActiveUsageSeconds(userId));
  }, [userId]);

  useEffect(() => {
    let lastSaveTime = Date.now();

    const interval = setInterval(() => {
      // Only count when document is visible (chỉ tính khi mở web/phần mềm lên)
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setSessionSeconds((prev) => prev + 1);
        setTodaySeconds((prev) => {
          const next = prev + 1;
          // Periodically save every 5 seconds to reduce storage writes
          if (Date.now() - lastSaveTime > 5000) {
            saveTodayActiveUsageSeconds(next, userId);
          }
          return next;
        });
        setTotalSeconds((prev) => {
          const next = prev + 1;
          if (Date.now() - lastSaveTime > 5000) {
            saveActiveUsageSeconds(next, userId);
            lastSaveTime = Date.now();
          }
          return next;
        });
      }
    }, 1000);

    const handleBeforeUnload = () => {
      // Flush before leaving
      saveTodayActiveUsageSeconds(todaySeconds, userId);
      saveActiveUsageSeconds(totalSeconds, userId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId, todaySeconds, totalSeconds]);

  return {
    sessionSeconds,
    todaySeconds,
    totalSeconds,
    sessionFormatted: formatSmartDurationFromSeconds(sessionSeconds),
    todayFormatted: formatSmartDurationFromSeconds(todaySeconds),
    totalFormatted: formatSmartDurationFromSeconds(totalSeconds),
  };
}
