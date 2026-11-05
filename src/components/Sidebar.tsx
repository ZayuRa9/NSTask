import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Archive,
  StickyNote,
  User,
  PlusCircle,
  Bell,
  Volume2,
  VolumeX,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Folder,
  Calendar,
  FileText,
  Menu,
  X,
  Sparkles,
  Link2,
  ChevronLeft,
  ChevronRight,
  Mic,
} from 'lucide-react';
import { UserProfile, UserAccount } from '../types/task';
import { playNotificationSound } from '../utils/audioNotification';

export type ActiveTab = 'overview' | 'tasks' | 'notes' | 'documents' | 'archive' | 'profile';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCreateModal: () => void;
  overdueCount: number;
  completedCount: number;
  activeCount: number;
  notesCount?: number;
  documentsCount?: number;
  userProfile: UserProfile;
  currentUser?: UserAccount | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt?: string;
  onSyncNow: () => void;
  onLogout: () => void;
  onOpenCalendarSync?: () => void;
  isCalendarConnected?: boolean;
  onOpenReportModal?: () => void;
  onOpenQuickVoice?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  overdueCount,
  completedCount,
  activeCount,
  notesCount,
  documentsCount,
  userProfile,
  currentUser,
  soundEnabled,
  onToggleSound,
  isOnline,
  isSyncing,
  lastSyncedAt,
  onSyncNow,
  onLogout,
  onOpenCalendarSync,
  isCalendarConnected,
  onOpenReportModal,
  onOpenQuickVoice,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Tổng quan',
      icon: LayoutDashboard,
      badge: null,
      color: 'text-indigo-600',
    },
    {
      id: 'tasks' as ActiveTab,
      label: 'Nhiệm vụ',
      icon: CheckSquare,
      badge: activeCount > 0 ? activeCount : null,
      badgeAlert: overdueCount > 0,
      color: 'text-indigo-600',
    },
    {
      id: 'archive' as ActiveTab,
      label: 'Lưu trữ hoàn thành',
      icon: Archive,
      badge: completedCount > 0 ? completedCount : null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
      color: 'text-emerald-600',
    },
    {
      id: 'notes' as ActiveTab,
      label: 'Ghi chú',
      icon: StickyNote,
      badge: typeof notesCount === 'number' && notesCount > 0 ? notesCount : null,
      badgeColor: 'bg-amber-100 text-amber-800',
      color: 'text-amber-500',
    },
    {
      id: 'documents' as ActiveTab,
      label: 'Tài liệu & Liên kết',
      icon: Folder,
      badge: typeof documentsCount === 'number' && documentsCount > 0 ? documentsCount : null,
      badgeColor: 'bg-blue-100 text-blue-800',
      color: 'text-blue-500',
    },
    {
      id: 'profile' as ActiveTab,
      label: 'Hồ sơ cá nhân',
      icon: User,
      badge: null,
      color: 'text-indigo-600',
    },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-md text-white">
        <button
          onClick={() => handleNavClick('overview')}
          className="flex items-center gap-2.5 text-left focus:outline-hidden"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-500 to-sky-400 flex items-center justify-center text-white shadow-xs">
            <CheckSquare className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-white tracking-tight">NSTask</span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <button
              onClick={() => handleNavClick('tasks')}
              className="p-1.5 rounded-lg bg-rose-600/30 text-rose-300 relative border border-rose-500/40"
              title={`${overdueCount} việc trễ hạn`}
            >
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {overdueCount}
              </span>
            </button>
          )}

          <button
            onClick={onOpenCreateModal}
            className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white"
            title="Tạo nhiệm vụ mới"
          >
            <PlusCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
            aria-label="Mở menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container: Deep navy/slate theme */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen ${
          isCollapsed ? 'w-64 md:w-20' : 'w-64 xl:w-72'
        } bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0A0F1D] text-slate-100 border-r border-slate-800/90 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 select-none shadow-xl ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Logo & Collapse Toggle */}
        <div className={`border-b border-slate-800/80 ${isCollapsed ? 'p-3' : 'p-4 sm:p-5'}`}>
          <div className="flex items-center justify-between gap-2">
            {!isCollapsed ? (
              <>
                <button
                  onClick={() => handleNavClick('overview')}
                  className="flex items-center gap-3 text-left group focus:outline-hidden cursor-pointer min-w-0"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <CheckSquare className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-base tracking-tight text-white">NSTask</span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[9px] font-black uppercase">PRO</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium truncate">Hệ Thống Quản Lý</p>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {onToggleCollapse && (
                    <button
                      onClick={onToggleCollapse}
                      className="hidden md:flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Thu gọn thanh bên"
                      aria-label="Thu gọn thanh bên"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="md:hidden p-1.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full flex flex-col items-center gap-2">
                <button
                  onClick={() => handleNavClick('overview')}
                  title="NSTask PRO - Bảng điều khiển"
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform cursor-pointer"
                >
                  <CheckSquare className="w-5 h-5 stroke-[2.2]" />
                </button>
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Mở rộng thanh bên"
                    aria-label="Mở rộng thanh bên"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Main Navigation Links */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-3' : 'px-3 py-4'} space-y-1.5`}>
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Điều hướng chính
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={`${item.label}${item.badge ? ` (${item.badge})` : ''}`}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-3 relative' : 'justify-between px-3.5 py-2.5'
                } rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white shadow-md shadow-indigo-950/50 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : item.color
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed ? (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.badgeAlert && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </div>
                ) : (
                  item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                        isActive
                          ? 'bg-white text-indigo-800'
                          : item.badgeColor || 'bg-indigo-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}

          {/* Quick Tools */}
          {!isCollapsed ? (
            <div className="pt-4 px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Công cụ nhanh
            </div>
          ) : (
            <div className="my-2 border-t border-slate-800" />
          )}

          {/* Google Calendar Link Button */}
          {onOpenCalendarSync && (
            <button
              onClick={() => {
                onOpenCalendarSync();
                setIsMobileOpen(false);
              }}
              title={isCalendarConnected ? 'Lịch Google (Đã kết nối)' : 'Lịch Google'}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-3 relative' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isCalendarConnected
                  ? 'bg-blue-900/40 text-blue-200 hover:bg-blue-800/50 border border-blue-700/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-slate-800'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                {!isCollapsed && <span className="truncate">Lịch Google</span>}
              </div>
              {isCalendarConnected && (
                <span className={`${isCollapsed ? 'absolute top-1.5 right-1.5' : ''} w-2 h-2 rounded-full bg-sky-400 animate-pulse`} />
              )}
            </button>
          )}

          {/* Word Report Button */}
          {onOpenReportModal && (
            <button
              onClick={() => {
                onOpenReportModal();
                setIsMobileOpen(false);
              }}
              title="Xuất Báo cáo Word (.docx)"
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 transition-all cursor-pointer`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                {!isCollapsed && <span className="truncate">Báo cáo Word (.docx)</span>}
              </div>
            </button>
          )}

          {/* Quick Voice Input Button */}
          {onOpenQuickVoice && (
            <button
              onClick={() => {
                onOpenQuickVoice();
                setIsMobileOpen(false);
              }}
              title="Nhập bằng giọng nói (Voice-to-Text)"
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
              } rounded-xl text-xs font-semibold text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 transition-all cursor-pointer group`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                <Mic className="w-4 h-4 text-rose-400 shrink-0 group-hover:scale-110 transition-transform" />
                {!isCollapsed && <span className="truncate">Nhập giọng nói</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Voice
                </span>
              )}
            </button>
          )}
        </div>

        {/* Bottom: Action Buttons & Sync Status */}
        <div className={`${isCollapsed ? 'p-2' : 'p-3 sm:p-4'} border-t border-slate-800/80 space-y-2 bg-slate-950/60`}>
          {/* Create Task Button */}
          <button
            onClick={() => {
              onOpenCreateModal();
              setIsMobileOpen(false);
            }}
            title="Tạo Nhiệm vụ mới"
            className={`w-full flex items-center justify-center gap-2 ${
              isCollapsed ? 'p-2.5' : 'py-2.5 px-3'
            } rounded-xl bg-gradient-to-r from-indigo-500 via-blue-600 to-indigo-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer`}
          >
            <PlusCircle className="w-4 h-4" />
            {!isCollapsed && <span>Tạo Nhiệm vụ mới</span>}
          </button>

          {/* Sync & Audio Controls Row */}
          <div className={`flex items-center justify-between gap-1 pt-1 ${isCollapsed ? 'flex-col' : ''}`}>
            {/* Sync Status Button */}
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              title={
                !isOnline
                  ? 'Ngoại tuyến (Lưu trên thiết bị)'
                  : isSyncing
                  ? 'Đang đồng bộ...'
                  : `Đã đồng bộ ${lastSyncedAt ? `(${new Date(lastSyncedAt).toLocaleTimeString()})` : ''}`
              }
              className={`${isCollapsed ? 'w-full p-2' : 'flex-1 px-2.5 py-1.5'} flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                !isOnline
                  ? 'bg-amber-950/60 text-amber-200 border-amber-700/50'
                  : isSyncing
                  ? 'bg-blue-950/60 text-blue-200 border-blue-700/50'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {!isCollapsed && <span className="truncate">Offline</span>}
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                  {!isCollapsed && <span className="truncate">Đồng bộ</span>}
                </>
              ) : (
                <div className="flex items-center justify-center py-0.5">
                  <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              )}
            </button>

            {/* Audio chime toggle */}
            <button
              onClick={() => {
                onToggleSound();
                if (!soundEnabled) {
                  playNotificationSound('reminder');
                }
              }}
              title={soundEnabled ? 'Âm thanh thông báo: Bật' : 'Âm thanh thông báo: Tắt'}
              className={`${isCollapsed ? 'w-full p-2' : 'p-2'} flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/50'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Đăng xuất"
              className={`${isCollapsed ? 'w-full p-2' : 'p-2'} flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-800/50 hover:bg-rose-950/40 transition-colors cursor-pointer`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
