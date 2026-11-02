import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface BirthDateInputProps {
  value: string; // ISO format "YYYY-MM-DD" or standard date string
  onChange: (isoDate: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Component nhập Ngày tháng năm sinh theo đúng thứ tự chuẩn Việt Nam:
 * Thứ tự nghiêm ngặt: Ngày (Day) -> Tháng (Month) -> Năm (Year)
 */
export const BirthDateInput: React.FC<BirthDateInputProps> = ({
  value,
  onChange,
  label = 'Ngày tháng năm sinh',
  required = true,
  disabled = false,
}) => {
  // Parse YYYY-MM-DD into day, month, year
  const { currentDay, currentMonth, currentYear } = useMemo(() => {
    if (!value) {
      return { currentDay: 1, currentMonth: 1, currentYear: 1996 };
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10) || 1996;
      const m = parseInt(parts[1], 10) || 1;
      const d = parseInt(parts[2], 10) || 1;
      return { currentDay: d, currentMonth: m, currentYear: y };
    }
    const dObj = new Date(value);
    if (!isNaN(dObj.getTime())) {
      return {
        currentDay: dObj.getDate(),
        currentMonth: dObj.getMonth() + 1,
        currentYear: dObj.getFullYear(),
      };
    }
    return { currentDay: 1, currentMonth: 1, currentYear: 1996 };
  }, [value]);

  const currentYearNow = new Date().getFullYear();

  // Days in month calculation (taking leap years into account)
  const maxDays = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  const safeDay = Math.min(currentDay, maxDays);

  const handleDayChange = (newDay: number) => {
    const formatted = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
    onChange(formatted);
  };

  const handleMonthChange = (newMonth: number) => {
    const newMaxDays = new Date(currentYear, newMonth, 0).getDate();
    const adjustedDay = Math.min(currentDay, newMaxDays);
    const formatted = `${currentYear}-${String(newMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
    onChange(formatted);
  };

  const handleYearChange = (newYear: number) => {
    const newMaxDays = new Date(newYear, currentMonth, 0).getDate();
    const adjustedDay = Math.min(currentDay, newMaxDays);
    const formatted = `${newYear}-${String(currentMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;
    onChange(formatted);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700 block flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
        <span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
      </label>

      <div className="grid grid-cols-3 gap-2">
        {/* 1. NGÀY */}
        <div>
          <select
            value={safeDay}
            disabled={disabled}
            onChange={(e) => handleDayChange(parseInt(e.target.value, 10))}
            className={`w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20 shadow-2xs ${
              disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed opacity-90' : 'bg-white cursor-pointer'
            }`}
          >
            {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Ngày {String(d).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* 2. THÁNG */}
        <div>
          <select
            value={currentMonth}
            disabled={disabled}
            onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
            className={`w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20 shadow-2xs ${
              disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed opacity-90' : 'bg-white cursor-pointer'
            }`}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* 3. NĂM */}
        <div>
          <select
            value={currentYear}
            disabled={disabled}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className={`w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20 shadow-2xs ${
              disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed opacity-90' : 'bg-white cursor-pointer'
            }`}
          >
            {Array.from({ length: currentYearNow - 1939 }, (_, i) => currentYearNow - i).map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
