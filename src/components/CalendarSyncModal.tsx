import React, { useState } from 'react';
import {
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Unlink,
  Clock,
  Sparkles,
  X,
  ShieldCheck,
  Globe,
  Copy,
  Check,
} from 'lucide-react';
import { Task, ExternalCalendarEvent, GoogleCalendarSyncState } from '../types/task';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  performTwoWayCalendarSync,
  getStoredSyncState,
  saveStoredSyncState,
} from '../services/calendarSyncService';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  externalEvents: ExternalCalendarEvent[];
  onTasksUpdated: (tasks: Task[]) => void;
  onExternalEventsUpdated: (events: ExternalCalendarEvent[]) => void;
  onConvertExternalEventToTask: (event: ExternalCalendarEvent) => void;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  tasks,
  externalEvents,
  onTasksUpdated,
  onExternalEventsUpdated,
  onConvertExternalEventToTask,
}) => {
  const [syncState, setSyncState] = useState<GoogleCalendarSyncState>(getStoredSyncState());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { email } = await connectGoogleCalendar();
      setSyncState((prev) => ({
        ...prev,
        isConnected: true,
        userEmail: email,
        lastSyncedAt: new Date().toISOString(),
      }));
      setSuccessMessage(`Đã kết nối thành công với tài khoản Google Calendar (${email})!`);

      // Trigger first sync immediately
      handleSyncNow();
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        (typeof err?.message === 'string' &&
          (err.message.includes('popup-closed-by-user') || err.message.includes('cancelled-popup-request')))
      ) {
        return;
      }
      setErrorMessage(err.message || 'Lỗi kết nối Google Calendar.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await performTwoWayCalendarSync(tasks);
      onTasksUpdated(result.updatedTasks);
      onExternalEventsUpdated(result.externalEvents);
      setSyncState((prev) => ({
        ...prev,
        isConnected: true,
        lastSyncedAt: result.lastSyncedAt,
        syncedEventsCount: result.syncedCount,
        externalEventsCount: result.externalEvents.length,
        syncStatus: 'success',
      }));
      setSuccessMessage(
        `Đồng bộ 2 chiều thành công! Đã đồng bộ ${result.syncedCount} nhiệm vụ lên lịch và nhận ${result.externalEvents.length} sự kiện từ Google Calendar.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi trong quá trình đồng bộ Google Calendar.');
      setSyncState((prev) => ({ ...prev, syncStatus: 'error' }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleCalendar();
    setSyncState(getStoredSyncState());
    setShowDisconnectConfirm(false);
    setSuccessMessage('Đã ngắt kết nối Google Calendar. Toàn bộ công việc nội bộ trong ứng dụng được bảo toàn nguyên vẹn.');
  };

  const formatEventDate = (dateObj: { dateTime?: string; date?: string }) => {
    if (!dateObj) return 'Chưa rõ';
    const iso = dateObj.dateTime || dateObj.date;
    if (!iso) return 'Chưa rõ';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const syncedTasksCount = tasks.filter((t) => Boolean(t.googleCalendarEventId)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Đồng Bộ Hai Chiều Google Calendar</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              syncState.isConnected
                ? 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200/90 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {syncState.isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>Trạng thái: {syncState.isConnected ? 'Đang kết nối' : 'Chưa kết nối'}</span>
                  {syncState.isConnected && syncState.userEmail && (
                    <span className="text-xs font-normal text-emerald-700">({syncState.userEmail})</span>
                  )}
                </div>
                {syncState.lastSyncedAt && (
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Đồng bộ gần nhất:{' '}
                    {new Date(syncState.lastSyncedAt).toLocaleTimeString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {syncState.isConnected ? (
                <>
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
                  </button>
                  <button
                    onClick={() => setShowDisconnectConfirm(true)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                    title="Ngắt kết nối Google Calendar"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Globe className="w-4 h-4" />
                  <span>{isConnecting ? 'Đang xác thực...' : 'Kết nối Google Calendar'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              {errorMessage.includes('unauthorized-domain') && (
                <div className="pt-1 flex flex-wrap items-center gap-2 border-t border-rose-200/80">
                  <button
                    type="button"
                    onClick={async () => {
                      const host = typeof window !== 'undefined' ? window.location.hostname : '';
                      await navigator.clipboard.writeText(host).catch(() => {});
                      setCopiedDomain(true);
                      setTimeout(() => setCopiedDomain(false), 3000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedDomain ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã sao chép miền!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép tên miền</span>
                      </>
                    )}
                  </button>
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0447949351/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 font-bold text-[11px] hover:bg-rose-50 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Mở Firebase Authorized Domains</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Disconnect Confirmation Modal Dialog */}
          {showDisconnectConfirm && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>Xác nhận ngắt kết nối Google Calendar?</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Khi ngắt kết nối, toàn bộ nhiệm vụ nội bộ trong ứng dụng sẽ được <strong>giữ nguyên 100%</strong>. Ứng dụng sẽ dừng tự động gửi cập nhật lên Google Calendar cho đến khi bạn kết nối lại.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer"
                >
                  Đồng ý ngắt kết nối
                </button>
              </div>
            </div>
          )}

          {/* Sync Stats Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Nhiệm vụ đã đẩy lên Lịch
              </div>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">{syncedTasksCount}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Liên kết 2 chiều với Google Calendar</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Sự kiện ngoài từ Google Calendar
              </div>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">{externalEvents.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Nguồn Google Calendar (không tự ghi đè)</div>
            </div>
          </div>

          {/* Sync Preferences & Two-Way Guarantee */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={syncState.autoSyncEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSyncState((prev) => ({ ...prev, autoSyncEnabled: checked }));
                    saveStoredSyncState({ autoSyncEnabled: checked });
                  }}
                  className="rounded text-blue-600"
                />
                <span>Tự động đồng bộ lên Google Calendar khi tạo hoặc sửa nhiệm vụ</span>
              </label>
            </div>
          </div>

          {/* External Google Calendar Events List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Sự Kiện Từ Google Calendar Ngoài ({externalEvents.length}):</span>
              </div>
            </div>

            {externalEvents.length === 0 ? (
              <div className="text-center py-6 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs">
                Chưa có sự kiện bên ngoài nào được tải về từ Google Calendar. Bấm &quot;Đồng bộ ngay&quot; để làm mới.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {externalEvents.slice(0, 10).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                          Google Calendar
                        </span>
                        <div className="font-semibold text-xs text-slate-800 truncate" title={ev.summary}>
                          {ev.summary}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                        <span>Bắt đầu: {formatEventDate(ev.start)}</span>
                        {ev.location && <span className="truncate">📍 {ev.location}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {ev.htmlLink && (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Mở trên Google Calendar"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => onConvertExternalEventToTask(ev)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Chuyển sự kiện này thành nhiệm vụ nội bộ của bạn"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tạo task</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mã hóa bảo mật thông tin &amp; bảo toàn dữ liệu gốc</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
