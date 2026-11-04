import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { ActiveTaskList } from './components/ActiveTaskList';
import { ArchiveVault } from './components/ArchiveVault';
import { NotesView } from './components/NotesView';
import { NoteModal } from './components/NoteModal';
import { ProfileView } from './components/ProfileView';
import { TaskFormModal } from './components/TaskFormModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { AuthView } from './components/AuthView';
import { CalendarSyncModal } from './components/CalendarSyncModal';
import { WordExcelImportModal } from './components/WordExcelImportModal';
import { DocumentManagerView } from './components/DocumentManagerView';
import { ReportExportModal } from './components/ReportExportModal';
import { Task, UserProfile, UserAccount, Note, ExternalCalendarEvent, TaskTimeframeFilter, ReportPeriodType } from './types/task';
import {
  getStoredSyncState,
  getCalendarAccessToken,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from './services/calendarSyncService';
import { getTaskStatus } from './utils/taskCalculations';
import { playNotificationSound, sendBrowserNotification } from './utils/audioNotification';
import {
  openDeviceDatabase,
  saveLocalTasksToIndexedDB,
  loadLocalTasksFromIndexedDB,
  getPendingOfflineQueue,
  clearOfflineQueueItems,
  enqueueOfflineSync,
  detectDeviceInfo,
  logSyncEvent,
  requestPersistentStorage,
} from './utils/indexedDb';
import { onAuthStateChanged } from 'firebase/auth';
import { testFirestoreConnection, auth } from './firebase';
import {
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  saveUserToFirestore,
  subscribeToUserTasks,
  logUserActivityToFirestore,
  fetchTasksFromFirestore,
  saveNoteToFirestore,
  deleteNoteFromFirestore,
  subscribeToUserNotes,
  fetchNotesFromFirestore,
} from './services/firestoreService';

function generateInitialDemoTasks(): Task[] {
  const now = new Date();
  const day = now.getDay();
  const diffToFriday = day <= 5 ? 5 - day : 5 - day + 7;
  const fridayThisWeek = new Date(now);
  fridayThisWeek.setDate(now.getDate() + (diffToFriday === 0 ? 1 : diffToFriday));
  fridayThisWeek.setHours(17, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(11, 30, 0, 0);

  const inTwoWeeks = new Date(now);
  inTwoWeeks.setDate(now.getDate() + 14);
  inTwoWeeks.setHours(16, 0, 0, 0);

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15, 10, 0, 0, 0);

  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);
  threeDaysAgo.setHours(17, 0, 0, 0);

  return [
    {
      id: 'demo-task-1',
      title: 'Dự thảo kế hoạch hoạt động phong trào thanh niên tuần này',
      description: 'Lấy ý kiến các chi hội trực thuộc và tổng hợp báo cáo gửi lãnh đạo đơn vị phê duyệt.',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: new Date(now.getTime() - 24 * 3600000).toISOString(),
      dueDate: tomorrow.toISOString(),
      subtasks: [
        { id: 'st-1-1', title: 'Thu thập đề xuất từ các chi hội', phase: 'Chuẩn bị', completed: true },
        { id: 'st-1-2', title: 'Tổng hợp và biên tập dự thảo', phase: 'Thực hiện', completed: false },
        { id: 'st-1-3', title: 'Xin ý kiến thường trực', phase: 'Nghiệm thu', completed: false },
      ],
      progress: 33,
      status: 'in_progress',
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 60 },
      tags: ['Kế hoạch', 'Phong trào'],
    },
    {
      id: 'demo-task-2',
      title: 'Họp giao ban trực tuyến rà soát tiến độ công việc tuần',
      description: 'Đánh giá các đầu việc trong tuần và thống nhất điều phối nhân sự các mảng trọng yếu.',
      unit: 'Chi hội 1',
      priority: 'medium',
      createdAt: new Date(now.getTime() - 12 * 3600000).toISOString(),
      dueDate: fridayThisWeek.toISOString(),
      subtasks: [
        { id: 'st-2-1', title: 'Gửi link phòng họp và tài liệu', phase: 'Chuẩn bị', completed: true },
        { id: 'st-2-2', title: 'Điểm danh và ghi biên bản họp', phase: 'Thực hiện', completed: false },
      ],
      progress: 50,
      status: 'in_progress',
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 },
      tags: ['Giao ban', 'Trực tuyến'],
    },
    {
      id: 'demo-task-3',
      title: 'Biên soạn kỷ yếu tổng kết quý và xuất bản số hóa',
      description: 'Tập hợp các bài viết, hình ảnh tư liệu hoạt động nổi bật để biên tập kỷ yếu điện tử trong tháng.',
      unit: 'Ban Thanh Niên',
      priority: 'low',
      createdAt: new Date(now.getTime() - 48 * 3600000).toISOString(),
      dueDate: inTwoWeeks.toISOString(),
      subtasks: [
        { id: 'st-3-1', title: 'Chọn lọc hình ảnh tư liệu chất lượng cao', completed: false },
        { id: 'st-3-2', title: 'Thiết kế dàn trang và bìa kỷ yếu', completed: false },
      ],
      progress: 0,
      status: 'pending',
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 },
      tags: ['Kỷ yếu', 'Xuất bản'],
    },
    {
      id: 'demo-task-4',
      title: 'Xây dựng phương án tổ chức hội nghị liên tịch mở rộng sắp tới',
      description: 'Lập dự trù kinh phí, nội dung chương trình nghị sự và mời chuyên gia tham gia báo cáo.',
      unit: 'Chi hội 1',
      priority: 'medium',
      createdAt: new Date(now.getTime() - 72 * 3600000).toISOString(),
      dueDate: nextMonth.toISOString(),
      subtasks: [
        { id: 'st-4-1', title: 'Lập khung chương trình nghị sự', completed: false },
      ],
      progress: 0,
      status: 'pending',
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 120 },
      tags: ['Hội nghị', 'Dự trù'],
    },
    {
      id: 'demo-task-5',
      title: 'Kiểm tra hồ sơ thanh quyết toán kinh phí hoạt động',
      description: 'Rà soát chứng từ các khoản chi tiêu thực tế để hoàn thiện hồ sơ gửi phòng kế toán.',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: new Date(now.getTime() - 5 * 24 * 3600000).toISOString(),
      dueDate: threeDaysAgo.toISOString(),
      subtasks: [
        { id: 'st-5-1', title: 'Đối chiếu hóa đơn với bảng kê chứng từ', completed: false },
      ],
      progress: 0,
      status: 'overdue',
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 60 },
      tags: ['Quyết toán', 'Tài chính'],
    },
  ];
}

export default function App() {
  // 1. Online / Offline Status
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);

  // Sidebar collapsed state for full-screen workspace
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('taskmaster_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('taskmaster_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // 2. Active User Account
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autostart') === '1') {
          const demoUser: UserAccount = {
            id: 'demo_user_1',
            username: 'canbo_quanly',
            email: 'canbo@quanly.gov.vn',
            authProvider: 'demo' as any,
            isProfileCompleted: true,
            syncCode: 'TM-DEMO',
            profile: {
              displayName: 'Cán bộ Quản lý',
              role: 'Cán bộ phụ trách',
              units: ['Ban Thanh Niên', 'Chi hội 1'],
              birthDate: '1995-01-01',
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
              weeklyGoal: 4,
              notifications: {
                browserEnabled: true,
                soundEnabled: true,
                priorityReminders: true,
                overdueAlerts: true,
              },
              connectedAppsList: [],
            },
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          };
          localStorage.setItem('taskmaster_current_user', JSON.stringify(demoUser));
          return demoUser;
        }
      }
      const savedUser = localStorage.getItem('taskmaster_current_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch {}
    return null;
  });

  // 3. User's Tasks (Isolated per user, demo tasks for demo user)
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const savedUser = localStorage.getItem('taskmaster_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const savedTasks = localStorage.getItem(`taskmaster_tasks_${parsed.id}`);
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
            return parsedTasks;
          }
        }
        if (parsed.id === 'demo_user_1') {
          const demoTasks = generateInitialDemoTasks();
          localStorage.setItem(`taskmaster_tasks_${parsed.id}`, JSON.stringify(demoTasks));
          return demoTasks;
        }
      }
    } catch {}
    return [];
  });

  // 3.5. User's Notes (Isolated per user, Keep-style cards)
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const savedUser = localStorage.getItem('taskmaster_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const savedNotes = localStorage.getItem(`taskmaster_notes_${parsed.id}`);
        if (savedNotes) return JSON.parse(savedNotes);
      }
    } catch {}
    return [];
  });

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNoteForEdit, setSelectedNoteForEdit] = useState<Note | null>(null);
  const [noteInitialLinkTaskId, setNoteInitialLinkTaskId] = useState<string | undefined>(undefined);
  const [noteInitialLabel, setNoteInitialLabel] = useState<string | undefined>(undefined);

  // 3.6. Google Calendar Sync & Word/Excel Batch Import State
  const [isCalendarSyncModalOpen, setIsCalendarSyncModalOpen] = useState(false);
  const [isWordExcelImportModalOpen, setIsWordExcelImportModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalPeriod, setReportModalPeriod] = useState<ReportPeriodType>('month');
  const [externalCalendarEvents, setExternalCalendarEvents] = useState<ExternalCalendarEvent[]>([]);
  const [calendarSyncState, setCalendarSyncState] = useState(() => getStoredSyncState());

  // 4. User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (currentUser?.profile) {
      return currentUser.profile;
    }
    return {
      displayName: 'Cán bộ',
      role: 'Cán bộ phụ trách',
      units: ['Ban Thanh Niên', 'Chi hội 1'],
      birthDate: '1996-01-01',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      weeklyGoal: 4,
      notifications: {
        browserEnabled: true,
        soundEnabled: true,
        priorityReminders: true,
        overdueAlerts: true,
      },
      connectedAppsList: [],
    };
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<TaskTimeframeFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(
    userProfile.notifications?.soundEnabled ?? true
  );

  // Persistent storage in IndexedDB alongside localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(tasks));
      saveLocalTasksToIndexedDB(currentUser.id, tasks).catch(() => {});
    }
  }, [tasks, currentUser]);

  // Persistent storage for notes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`taskmaster_notes_${currentUser.id}`, JSON.stringify(notes));
    }
  }, [notes, currentUser]);

  // Real-time Firestore Notes Subscription
  useEffect(() => {
    if (!currentUser?.id || !isOnline) return;
    if (!auth.currentUser || auth.currentUser.uid !== currentUser.id) return;

    const unsubscribe = subscribeToUserNotes(
      currentUser.id,
      (remoteNotes) => {
        if (Array.isArray(remoteNotes)) {
          setNotes((prev) => {
            const map = new Map<string, Note>();
            prev.forEach((n) => map.set(n.id, n));
            remoteNotes.forEach((n) => map.set(n.id, n));
            return Array.from(map.values());
          });
        }
      },
      () => {}
    );

    return () => unsubscribe();
  }, [currentUser?.id, isOnline]);

  // Load from IndexedDB on startup or account switch
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    loadLocalTasksFromIndexedDB(currentUser.id).then((storedTasks) => {
      if (!active) return;
      if (Array.isArray(storedTasks) && storedTasks.length > 0) {
        setTasks((prev) => {
          // If state is empty or has fewer tasks, prefer persistent IndexedDB
          if (prev.length === 0 || storedTasks.length > prev.length) {
            return storedTasks;
          }
          return prev;
        });
      } else if (tasks.length > 0) {
        saveLocalTasksToIndexedDB(currentUser.id, tasks).catch(() => {});
      }
    });
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  // 1. Boot connection test to Firestore
  useEffect(() => {
    testFirestoreConnection().catch(() => {});
  }, []);

  // 2. Real-time Firestore Task Subscription (only when user is authenticated with Firebase)
  useEffect(() => {
    if (!currentUser?.id || !isOnline) return;
    if (!auth.currentUser || auth.currentUser.uid !== currentUser.id) return;

    const unsubscribe = subscribeToUserTasks(
      currentUser.id,
      (remoteTasks) => {
        if (Array.isArray(remoteTasks) && remoteTasks.length > 0) {
          setTasks((prev) => {
            if (JSON.stringify(remoteTasks) !== JSON.stringify(prev)) {
              localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(remoteTasks));
              saveLocalTasksToIndexedDB(currentUser.id, remoteTasks).catch(() => {});
              return remoteTasks;
            }
            return prev;
          });
        }
      },
      (err) => {
        console.warn('[Firestore Subscription] Listener notice:', err);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.id, isOnline]);

  // 3. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (fbUser) => {
        if (fbUser && (!currentUser || currentUser.id === fbUser.uid)) {
          fetchTasksFromFirestore(fbUser.uid)
            .then((remoteTasks) => {
              if (Array.isArray(remoteTasks) && remoteTasks.length > 0) {
                setTasks(remoteTasks);
                localStorage.setItem(`taskmaster_tasks_${fbUser.uid}`, JSON.stringify(remoteTasks));
                saveLocalTasksToIndexedDB(fbUser.uid, remoteTasks).catch(() => {});
              }
            })
            .catch(() => {});
        }
      },
      (error) => {
        console.warn('[Firebase Auth] Observer notice:', error?.message || error);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Sync profile to localStorage and Firestore
  useEffect(() => {
    if (currentUser) {
      const updatedUser: UserAccount = {
        ...currentUser,
        profile: userProfile,
      };
      localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedUser));
      if (isOnline && auth.currentUser && auth.currentUser.uid === currentUser.id) {
        saveUserToFirestore(updatedUser).catch(() => {});
      }
    }
  }, [userProfile, currentUser, isOnline]);

  // Flush offline sync queue to server
  const flushOfflineQueue = useCallback(async () => {
    if (!currentUser || !isOnline) return;
    try {
      const queue = await getPendingOfflineQueue(currentUser.id);
      if (queue.length === 0) return;

      const ops = queue.map((q) => ({
        action: q.action,
        taskId: q.taskId,
        taskData: q.taskData,
      }));
      const info = detectDeviceInfo();
      const res = await fetch('/api/sync/incremental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          deviceId: info.deviceId,
          operations: ops,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const itemIds = queue.map((q) => q.id!).filter(Boolean);
        await clearOfflineQueueItems(itemIds);
        await logSyncEvent(
          'incremental_sync',
          'success',
          `Đã giải phóng và đồng bộ ${ops.length} thao tác từ hàng đợi ngoại tuyến`,
          ops.length
        );
        if (Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          await saveLocalTasksToIndexedDB(currentUser.id, data.tasks);
        }
        if (data.syncedAt) {
          setLastSyncedAt(data.syncedAt);
        }
      }
    } catch {
      // Remain offline and keep queue for later
    }
  }, [currentUser, isOnline]);

  // Online / Offline Listeners & Queue Auto-Drain
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      logSyncEvent('incremental_sync', 'warning', 'Thiết bị mất kết nối mạng. Chuyển sang lưu trữ ngoại tuyến trên thiết bị.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushOfflineQueue]);

  // Server Push Synchronization
  const triggerSync = useCallback(async (tasksToSync?: Task[]) => {
    if (!currentUser || !isOnline) return;
    setIsSyncing(true);
    const payloadTasks = tasksToSync ?? tasks;
    try {
      const res = await fetch('/api/sync/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          tasks: payloadTasks,
          profile: userProfile,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastSyncedAt(data.syncedAt || new Date().toISOString());
        logSyncEvent('push', 'success', `Đã đồng bộ ${payloadTasks.length} nhiệm vụ lên máy chủ`, payloadTasks.length);
      }
    } catch {
      // Offline fallback: data is already safely stored in IndexedDB & localStorage
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, isOnline, tasks, userProfile]);

  // Server Pull Synchronization (Refreshes data across devices)
  const pullLatestFromServer = useCallback(async () => {
    if (!currentUser || !isOnline) return;
    try {
      const res = await fetch(`/api/sync/tasks/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks)) {
          setTasks((prev) => {
            // Merge tasks: index server tasks
            const map = new Map<string, Task>();
            for (const t of data.tasks) {
              map.set(t.id, t);
            }
            // Keep any local pending tasks that haven't reached server yet
            for (const t of prev) {
              if (!map.has(t.id)) {
                map.set(t.id, t);
              }
            }
            const merged = Array.from(map.values());
            if (currentUser) {
              localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(merged));
            }
            return merged;
          });
        }
        const incomingPairedId = data.pairedUserId ?? data.pairedUser?.id;
        const incomingPairedName = data.pairedUserName ?? data.pairedUser?.name;
        const incomingPairedSyncCode = data.pairedSyncCode ?? data.pairedUser?.syncCode;
        const incomingPairedAt = data.pairedAt ?? data.pairedUser?.pairedAt;

        if (data.profile || data.syncCode || incomingPairedId !== currentUser.pairedUserId) {
          if (data.profile) {
            setUserProfile(data.profile);
          }
          const updatedUser: UserAccount = {
            ...currentUser,
            profile: data.profile || currentUser.profile,
            isProfileCompleted: data.isProfileCompleted ?? currentUser.isProfileCompleted,
            syncCode: data.syncCode || currentUser.syncCode,
            pairedUserId: incomingPairedId,
            pairedUserName: incomingPairedName,
            pairedSyncCode: incomingPairedSyncCode,
            pairedAt: incomingPairedAt,
          };
          setCurrentUser(updatedUser);
          localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedUser));
        }
        if (data.syncedAt) {
          setLastSyncedAt(data.syncedAt);
        }
      }
    } catch {
      // Offline fallback
    }
  }, [currentUser, isOnline]);

  // Device heartbeat and remote revocation detection
  const heartbeatAndCheckRevocation = useCallback(async () => {
    if (!currentUser || !isOnline) return;
    try {
      const info = detectDeviceInfo();
      const res = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          deviceId: info.deviceId,
          deviceName: info.deviceName,
          deviceType: info.deviceType,
          browser: info.browser,
          os: info.os,
        }),
      });
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.revoked) {
          alert('Phiên đăng nhập trên thiết bị này đã bị thu hồi từ xa!');
          handleLogout();
          return;
        }
      }
      if (res.ok) {
        const data = await res.json();
        const thisDev = data.devices?.find((d: any) => d.deviceId === info.deviceId);
        if (thisDev && thisDev.status === 'revoked') {
          alert('Phiên làm việc trên thiết bị này đã bị ngắt kết nối từ xa!');
          handleLogout();
        }
      }
    } catch {}
  }, [currentUser, isOnline]);

  // Two-way manual sync button handler
  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    await flushOfflineQueue();
    await triggerSync();
    await pullLatestFromServer();
    await heartbeatAndCheckRevocation();
    setIsSyncing(false);
  };

  // Auto-refresh when user switches back to this tab or window
  useEffect(() => {
    const handleFocus = () => {
      pullLatestFromServer();
      heartbeatAndCheckRevocation();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [pullLatestFromServer, heartbeatAndCheckRevocation]);

  // Periodic background pull and device heartbeat
  useEffect(() => {
    if (!currentUser || !isOnline) return;
    heartbeatAndCheckRevocation();
    const interval = setInterval(() => {
      pullLatestFromServer();
      heartbeatAndCheckRevocation();
    }, 20000);
    return () => clearInterval(interval);
  }, [currentUser, isOnline, pullLatestFromServer, heartbeatAndCheckRevocation]);

  // Cache of task IDs and timestamp of when 24h deadline alert was sent (avoids spamming)
  const notified24hTasksRef = useRef<Map<string, number>>(new Map());

  // Recalculate status of tasks based on current time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.status === 'completed') return t;
          const status = getTaskStatus(t, now);
          if (status !== t.status) {
            return { ...t, status };
          }
          return t;
        })
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Periodic check for tasks with deadlines within the next 24 hours
  const checkUpcoming24hDeadlines = useCallback(() => {
    if (!tasks || tasks.length === 0) return;
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const NOTIFY_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4-hour cooldown between repeated alerts for the same task

    tasks.forEach((task) => {
      if (task.status === 'completed' || !task.dueDate) return;

      const dueMs = new Date(task.dueDate).getTime();
      if (isNaN(dueMs)) return;

      const diffMs = dueMs - now;

      // Check if deadline is strictly within the next 24 hours and not expired in the past
      if (diffMs > 0 && diffMs <= TWENTY_FOUR_HOURS_MS) {
        const lastNotifiedAt = notified24hTasksRef.current.get(task.id);
        if (!lastNotifiedAt || now - lastNotifiedAt > NOTIFY_COOLDOWN_MS) {
          notified24hTasksRef.current.set(task.id, now);

          const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
          const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const timeRemainingText =
            hoursLeft > 0
              ? `${hoursLeft} giờ ${minutesLeft > 0 ? `${minutesLeft} phút` : ''}`
              : `${minutesLeft} phút`;

          const dueTimeFormatted = new Date(task.dueDate).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const dueDateFormatted = new Date(task.dueDate).toLocaleDateString('vi-VN');

          // Send browser notification
          const isBrowserEnabled = userProfile.notifications?.browserEnabled ?? true;
          if (isBrowserEnabled) {
            sendBrowserNotification(`⏰ Sắp đến hạn: ${task.title}`, {
              body: `Nhiệm vụ thuộc "${task.unit}" sẽ hết hạn trong ${timeRemainingText} (lúc ${dueTimeFormatted} ngày ${dueDateFormatted}). Hãy kiểm tra và hoàn tất!`,
              tag: `deadline-24h-${task.id}`,
            });
          }

          // Play notification chime
          const isSoundEnabled = soundEnabled && (userProfile.notifications?.soundEnabled ?? true);
          if (isSoundEnabled) {
            playNotificationSound('reminder');
          }
        }
      }
    });
  }, [tasks, userProfile.notifications, soundEnabled]);

  // Run periodic 24-hour deadline checking interval (every 60s)
  useEffect(() => {
    checkUpcoming24hDeadlines();
    const interval = setInterval(() => {
      checkUpcoming24hDeadlines();
    }, 60000);
    return () => clearInterval(interval);
  }, [checkUpcoming24hDeadlines]);

  // Compute counts
  const overdueCount = tasks.filter((t) => t.status === 'overdue').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const activeCount = tasks.filter((t) => t.status !== 'completed').length;

  // Handlers
  const handleLoginSuccess = async (account: UserAccount, initialTasksList: any[] = []) => {
    setCurrentUser(account);
    setUserProfile(account.profile);
    setSoundEnabled(account.profile.notifications?.soundEnabled ?? true);
    localStorage.setItem('taskmaster_current_user', JSON.stringify(account));

    // Request persistent storage on this device
    try {
      await requestPersistentStorage();
    } catch {}

    // Load tasks for this specific account
    let loadedTasks: Task[] = [];
    if (Array.isArray(initialTasksList) && initialTasksList.length > 0) {
      loadedTasks = initialTasksList;
    } else {
      try {
        const raw = localStorage.getItem(`taskmaster_tasks_${account.id}`);
        if (raw) {
          loadedTasks = JSON.parse(raw);
        }
      } catch {}
    }

    setTasks(loadedTasks);
    localStorage.setItem(`taskmaster_tasks_${account.id}`, JSON.stringify(loadedTasks));
    saveLocalTasksToIndexedDB(account.id, loadedTasks).catch(() => {});

    // Always synchronize with server upon login to pull the absolute freshest state across devices
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/sync/tasks/${account.id}`);
        if (res.ok) {
          const syncData = await res.json();
          if (Array.isArray(syncData.tasks)) {
            setTasks(syncData.tasks);
            localStorage.setItem(`taskmaster_tasks_${account.id}`, JSON.stringify(syncData.tasks));
            await saveLocalTasksToIndexedDB(account.id, syncData.tasks);
            await logSyncEvent(
              'pull',
              'success',
              `Đồng bộ hóa tài khoản khi đăng nhập thành công (${syncData.tasks.length} nhiệm vụ)`,
              syncData.tasks.length
            );
          }
          if (syncData.profile) {
            setUserProfile(syncData.profile);
          }
          if (syncData.syncedAt) {
            setLastSyncedAt(syncData.syncedAt);
          }
        }
      } catch {}
    }
  };

  const handleProfileOnboardingComplete = (completedProfile: UserProfile) => {
    if (!currentUser) return;
    const updatedAccount: UserAccount = {
      ...currentUser,
      isProfileCompleted: true,
      profile: completedProfile,
      lastSyncedAt: new Date().toISOString(),
    };
    setCurrentUser(updatedAccount);
    setUserProfile(completedProfile);
    setSoundEnabled(completedProfile.notifications?.soundEnabled ?? true);
    localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedAccount));

    // Update local accounts directory
    try {
      const savedAccounts = localStorage.getItem('taskmaster_local_accounts');
      if (savedAccounts) {
        const accounts: UserAccount[] = JSON.parse(savedAccounts);
        const idx = accounts.findIndex((a) => a.id === updatedAccount.id);
        if (idx >= 0) accounts[idx] = updatedAccount;
        else accounts.push(updatedAccount);
        localStorage.setItem('taskmaster_local_accounts', JSON.stringify(accounts));
      }
    } catch {}

    // Preserve existing tasks if user already has data from previous sessions or cross-device
    setTasks((prev) => {
      localStorage.setItem(`taskmaster_tasks_${updatedAccount.id}`, JSON.stringify(prev));
      return prev;
    });

    if (soundEnabled) {
      playNotificationSound('success');
    }
  };

  const handleAccountUpdated = (updatedUser: UserAccount, mergedTasks?: Task[]) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedUser));
    if (updatedUser.profile) {
      setUserProfile(updatedUser.profile);
    }
    if (Array.isArray(mergedTasks)) {
      setTasks(mergedTasks);
      localStorage.setItem(`taskmaster_tasks_${updatedUser.id}`, JSON.stringify(mergedTasks));
      if (updatedUser.pairedUserId) {
        localStorage.setItem(`taskmaster_tasks_${updatedUser.pairedUserId}`, JSON.stringify(mergedTasks));
      }
    }
    try {
      const savedAccounts = localStorage.getItem('taskmaster_local_accounts');
      if (savedAccounts) {
        const accounts: UserAccount[] = JSON.parse(savedAccounts);
        const idx = accounts.findIndex((a) => a.id === updatedUser.id);
        if (idx >= 0) accounts[idx] = updatedUser;
        else accounts.push(updatedUser);
        localStorage.setItem('taskmaster_local_accounts', JSON.stringify(accounts));
      }
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch {}
    localStorage.removeItem('taskmaster_current_user');
    setCurrentUser(null);
    setTasks([]);
    setNotes([]);
    setActiveTab('overview');
  };

  const handleSaveNote = (savedNote: Note) => {
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === savedNote.id);
      const nextNotes = exists
        ? prev.map((n) => (n.id === savedNote.id ? savedNote : n))
        : [savedNote, ...prev];
      if (currentUser) {
        localStorage.setItem(`taskmaster_notes_${currentUser.id}`, JSON.stringify(nextNotes));
      }
      return nextNotes;
    });

    if (currentUser && isOnline) {
      saveNoteToFirestore(currentUser.id, savedNote).catch(() => {});
    }

    if (soundEnabled) {
      playNotificationSound('success');
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => {
      const nextNotes = prev.filter((n) => n.id !== noteId);
      if (currentUser) {
        localStorage.setItem(`taskmaster_notes_${currentUser.id}`, JSON.stringify(nextNotes));
      }
      return nextNotes;
    });

    if (currentUser && isOnline) {
      deleteNoteFromFirestore(currentUser.id, noteId).catch(() => {});
    }
  };

  const handleOpenNoteModal = (note?: Note, initialLinkedTaskId?: string) => {
    setSelectedNoteForEdit(note || null);
    setNoteInitialLinkTaskId(initialLinkedTaskId);
    setIsNoteModalOpen(true);
  };

  const handleConvertChecklistToTask = (checklistText: string, noteTitle: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: checklistText.trim(),
      description: `Được chuyển đổi từ mục checklist trong ghi chú: "${noteTitle}"`,
      unit: userProfile.units[0] || 'Ban Thanh Niên',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      subtasks: [
        { id: `sub-${Date.now()}`, title: checklistText.trim(), phase: 'Thực hiện', completed: false },
      ],
      progress: 0,
      status: 'pending',
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 60 },
      assigner: userProfile.defaultAssigner,
    };
    handleSaveTask(newTask);
  };

  const handleBatchCreateTasks = (newTasks: Task[]) => {
    if (!newTasks || newTasks.length === 0) return;
    newTasks.forEach((t) => handleSaveTask(t));
  };

  const handleSaveTask = (savedTask: Task) => {
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      nextTasks = exists ? prev.map((t) => (t.id === savedTask.id ? savedTask : t)) : [savedTask, ...prev];
      if (currentUser) {
        localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(nextTasks));
        saveLocalTasksToIndexedDB(currentUser.id, nextTasks).catch(() => {});
        if (!isOnline) {
          enqueueOfflineSync(currentUser.id, 'upsert', savedTask.id, savedTask).catch(() => {});
          logSyncEvent('offline_queued', 'info', `Xếp hàng lưu ngoại tuyến: ${savedTask.title}`);
        }
      }
      return nextTasks;
    });

    // Direct Firestore write and activity logging
    if (currentUser && isOnline) {
      saveTaskToFirestore(currentUser.id, savedTask).catch(() => {});
      logUserActivityToFirestore(currentUser.id, 'task_create', `Tạo nhiệm vụ: ${savedTask.title}`).catch(() => {});
    }

    // Google Calendar Two-Way Sync (Auto-push on creation)
    if (calendarSyncState.isConnected && calendarSyncState.autoSyncEnabled && savedTask.dueDate) {
      const gcalToken = getCalendarAccessToken();
      if (gcalToken) {
        if (savedTask.googleCalendarEventId) {
          updateGoogleCalendarEvent(gcalToken, savedTask.googleCalendarEventId, savedTask).catch(() => {});
        } else {
          createGoogleCalendarEvent(gcalToken, savedTask)
            .then((eventId) => {
              if (eventId) {
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === savedTask.id
                      ? { ...t, googleCalendarEventId: eventId, googleCalendarSyncedAt: new Date().toISOString() }
                      : t
                  )
                );
              }
            })
            .catch(() => {});
        }
      }
    }

    if (soundEnabled) {
      playNotificationSound('success');
    }

    // Background sync with immediate latest tasks
    if (nextTasks.length > 0) {
      triggerSync(nextTasks);
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      if (currentUser) {
        localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(nextTasks));
        saveLocalTasksToIndexedDB(currentUser.id, nextTasks).catch(() => {});
        if (!isOnline) {
          enqueueOfflineSync(currentUser.id, 'upsert', updatedTask.id, updatedTask).catch(() => {});
          logSyncEvent('offline_queued', 'info', `Xếp hàng cập nhật ngoại tuyến: ${updatedTask.title}`);
        }
      }
      return nextTasks;
    });

    // Direct Firestore write and activity logging
    if (currentUser && isOnline) {
      saveTaskToFirestore(currentUser.id, updatedTask).catch(() => {});
      logUserActivityToFirestore(currentUser.id, 'task_update', `Cập nhật nhiệm vụ: ${updatedTask.title}`).catch(() => {});
    }

    // Google Calendar Sync update
    if (calendarSyncState.isConnected && calendarSyncState.autoSyncEnabled && updatedTask.dueDate) {
      const gcalToken = getCalendarAccessToken();
      if (gcalToken && updatedTask.googleCalendarEventId) {
        updateGoogleCalendarEvent(gcalToken, updatedTask.googleCalendarEventId, updatedTask).catch(() => {});
      }
    }

    // Background sync with immediate latest tasks
    if (nextTasks.length > 0) {
      triggerSync(nextTasks);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target) {
      setTaskToDelete(target);
    }
  };

  const handleConfirmDelete = (taskId: string) => {
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.filter((t) => t.id !== taskId);
      if (currentUser) {
        localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(nextTasks));
        saveLocalTasksToIndexedDB(currentUser.id, nextTasks).catch(() => {});
        if (!isOnline) {
          enqueueOfflineSync(currentUser.id, 'delete', taskId).catch(() => {});
          logSyncEvent('offline_queued', 'info', `Xếp hàng xóa ngoại tuyến: ${taskId}`);
        }
      }
      return nextTasks;
    });

    // Direct Firestore deletion and activity logging
    if (currentUser && isOnline) {
      deleteTaskFromFirestore(currentUser.id, taskId).catch(() => {});
      logUserActivityToFirestore(currentUser.id, 'task_delete', `Xóa nhiệm vụ: ${taskId}`).catch(() => {});
    }

    setTaskToDelete(null);
    triggerSync(nextTasks);
  };

  const handleArchiveTask = (task: Task) => {
    const updated: Task = {
      ...task,
      progress: 100,
      status: 'completed',
      completedAt: new Date().toISOString(),
      subtasks: task.subtasks.map((s) => ({ ...s, completed: true })),
    };
    handleUpdateTask(updated);

    if (soundEnabled) {
      playNotificationSound('success');
    }

    if (userProfile.notifications?.browserEnabled) {
      sendBrowserNotification('Nhiệm vụ hoàn thành!', {
        body: `Nhiệm vụ "${task.title}" đã được nghiệm thu và lưu trữ thành công.`,
      });
    }
  };

  const handleRestoreTask = (task: Task) => {
    const updated: Task = {
      ...task,
      status: 'in_progress',
      completedAt: undefined,
    };
    handleUpdateTask(updated);
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    if (currentUser) {
      const updatedUser: UserAccount = {
        ...currentUser,
        profile: updatedProfile,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedUser));
      // Trigger background sync to persist updated profile to server
      if (isOnline) {
        fetch('/api/sync/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            tasks,
            profile: updatedProfile,
          }),
        }).catch(() => {});
      }
    }
  };

  const [defaultDueDateForModal, setDefaultDueDateForModal] = useState<string | undefined>(undefined);

  const handleOpenCreateModal = (defaultDueDate?: string | unknown) => {
    setEditingTask(null);
    setDefaultDueDateForModal(typeof defaultDueDate === 'string' ? defaultDueDate : undefined);
    setIsModalOpen(true);
  };

  const handleNavigateToTasks = (
    filter?: 'all' | 'in_progress' | 'overdue' | 'completed',
    timeframe?: TaskTimeframeFilter
  ) => {
    if (filter === 'completed') {
      setActiveTab('archive');
    } else {
      setStatusFilter(filter || 'all');
      if (timeframe) {
        setTimeframeFilter(timeframe);
      }
      setActiveTab('tasks');
    }
  };

  const handleToggleSound = () => {
    const newSound = !soundEnabled;
    setSoundEnabled(newSound);
    setUserProfile((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        soundEnabled: newSound,
      },
    }));
  };

  // ----------------------------------------------------
  // ROUTING & AUTH WORKFLOW GATES
  // ----------------------------------------------------

  // Gate 1: No User Logged In -> Show AuthView (Login / Register)
  if (!currentUser) {
    return <AuthView onLoginSuccess={handleLoginSuccess} isOnline={isOnline} />;
  }

  // Authenticated -> Access Full Application directly (user configures role and units in Profile tab)

  // Gate 3: Authenticated & Profile Set -> Access Full Application
  return (
    <div className="min-h-screen bg-[#EEF2F6] text-slate-800 flex flex-col md:flex-row font-['Be_Vietnam_Pro',sans-serif]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={handleOpenCreateModal}
        overdueCount={overdueCount}
        completedCount={completedCount}
        activeCount={activeCount}
        notesCount={notes.filter((n) => !n.isArchived && !n.isDeleted).length}
        userProfile={userProfile}
        currentUser={currentUser}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        isOnline={isOnline}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onSyncNow={handleManualSyncNow}
        onLogout={handleLogout}
        onOpenCalendarSync={() => setIsCalendarSyncModalOpen(true)}
        isCalendarConnected={calendarSyncState.isConnected}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Right Column: Main Content Area + Footer */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#EEF2F6]">
        <main className="flex-1 w-full px-3 sm:px-5 lg:px-6 py-4 sm:py-6 transition-all duration-300">
        {activeTab === 'overview' && (
          <DashboardOverview
            tasks={tasks}
            notes={notes}
            userProfile={userProfile}
            onNavigateToTasks={handleNavigateToTasks}
            onOpenCreateModal={handleOpenCreateModal}
            onNavigateToNotes={() => setActiveTab('notes')}
            onOpenCreateNote={() => handleOpenNoteModal()}
            onQuickCompleteTask={handleArchiveTask}
            onEditTask={handleEditTask}
            onOpenCalendarSync={() => setIsCalendarSyncModalOpen(true)}
            onOpenWordExcelImport={() => setIsWordExcelImportModalOpen(true)}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        )}

        {activeTab === 'tasks' && (
          <ActiveTaskList
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onArchiveTask={handleArchiveTask}
            onOpenCreateModal={handleOpenCreateModal}
            units={userProfile.units}
            initialStatusFilter={statusFilter}
            initialTimeframeFilter={timeframeFilter}
          />
        )}

        {activeTab === 'notes' && (
          <NotesView
            notes={notes}
            tasks={tasks}
            onOpenNoteModal={handleOpenNoteModal}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onConvertChecklistToTask={handleConvertChecklistToTask}
            onOpenTaskDetail={(taskId) => {
              const t = tasks.find((item) => item.id === taskId);
              if (t) {
                handleEditTask(t);
              }
            }}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentManagerView
            tasks={tasks}
            userProfile={userProfile}
            currentUserId={currentUser?.id}
            onOpenTaskModal={handleEditTask}
          />
        )}

        {activeTab === 'archive' && (
          <ArchiveVault
            completedTasks={tasks.filter((t) => t.status === 'completed')}
            userProfile={userProfile}
            onRestoreTask={handleRestoreTask}
            onDeleteTask={handleDeleteTask}
            onOpenCreateModal={handleOpenCreateModal}
            onOpenReportModal={(period) => {
              setReportModalPeriod(period || 'archive');
              setIsReportModalOpen(true);
            }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            currentUser={currentUser}
            onAccountUpdated={handleAccountUpdated}
            onTriggerSync={triggerSync}
            isOnline={isOnline}
            tasks={tasks}
            onTasksUpdated={(newTasks) => {
              setTasks(newTasks);
              if (currentUser) {
                localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(newTasks));
                saveLocalTasksToIndexedDB(currentUser.id, newTasks).catch(() => {});
              }
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800">NSTask</span>
            <span>•</span>
            <span>Hệ Thống Quản Lý &amp; Nhắc Việc Thông Minh</span>
          </div>
          <div className="text-slate-400">
            Phiên bản trực tuyến • Bảo mật &amp; Bền vững
          </div>
        </div>
      </footer>
    </div>

      {/* Task Creation / Editing Modal */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
          setDefaultDueDateForModal(undefined);
        }}
        onSaveTask={handleSaveTask}
        onBatchCreateTasks={handleBatchCreateTasks}
        initialTask={editingTask}
        defaultDueDate={defaultDueDateForModal}
        userProfile={userProfile}
      />

      {/* Note Creation / Editing Modal */}
      {isNoteModalOpen && (
        <NoteModal
          isOpen={isNoteModalOpen}
          note={selectedNoteForEdit}
          tasks={tasks}
          initialLinkedTaskId={noteInitialLinkTaskId}
          onClose={() => {
            setIsNoteModalOpen(false);
            setSelectedNoteForEdit(null);
            setNoteInitialLinkTaskId(undefined);
          }}
          onSaveNote={handleSaveNote}
          onConvertChecklistToTask={handleConvertChecklistToTask}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(taskToDelete)}
        task={taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Google Calendar Two-Way Sync Modal */}
      <CalendarSyncModal
        isOpen={isCalendarSyncModalOpen}
        onClose={() => setIsCalendarSyncModalOpen(false)}
        tasks={tasks}
        externalEvents={externalCalendarEvents}
        onTasksUpdated={(updatedTasks: Task[]) => {
          setTasks(updatedTasks);
          if (currentUser) {
            localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(updatedTasks));
            saveLocalTasksToIndexedDB(currentUser.id, updatedTasks).catch(() => {});
          }
        }}
        onExternalEventsUpdated={(events: ExternalCalendarEvent[]) => {
          setExternalCalendarEvents(events);
        }}
        onConvertExternalEventToTask={(extEvent: ExternalCalendarEvent) => {
          setIsCalendarSyncModalOpen(false);
          const startVal = extEvent.start?.dateTime || extEvent.start?.date || new Date().toISOString();
          const endVal = extEvent.end?.dateTime || extEvent.end?.date || startVal;
          const newTask: Partial<Task> = {
            id: 'task_' + Date.now(),
            title: extEvent.summary || 'Sự kiện Google Calendar',
            description: extEvent.description || 'Được chuyển đổi từ sự kiện Google Calendar',
            unit: userProfile.units[0] || 'Cá nhân',
            priority: 'medium',
            status: 'pending',
            progress: 0,
            subtasks: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            dueDate: endVal.slice(0, 10),
            googleCalendarEventId: extEvent.id,
            source: 'google_calendar',
            externalEventData: extEvent,
          };
          setEditingTask(newTask as Task);
          setIsModalOpen(true);
        }}
      />

      {/* Word / Excel Batch Document Importer Modal */}
      <WordExcelImportModal
        isOpen={isWordExcelImportModalOpen}
        onClose={() => setIsWordExcelImportModalOpen(false)}
        onConfirmImport={(importedCandidates: Partial<Task>[]) => {
          const tasksToCreate: Task[] = importedCandidates.map((it, idx) => ({
            id: 'task_' + Date.now() + '_' + idx,
            title: it.title || 'Nhiệm vụ mới',
            description: it.description || '',
            unit: it.unit || userProfile.units[0] || 'Ban Thanh Niên',
            priority: it.priority || 'medium',
            status: it.status || 'pending',
            progress: it.progress || 0,
            subtasks: it.subtasks || [],
            attachments: it.attachments || [],
            links: it.links || [],
            reminder: it.reminder || { enabled: true, minutesBefore: 60 },
            createdAt: it.createdAt || new Date().toISOString(),
            dueDate: it.dueDate || new Date().toISOString().slice(0, 10),
            assigner: it.assigner,
            googleCalendarEventId: it.googleCalendarEventId,
            source: 'document_import',
          }));
          handleBatchCreateTasks(tasksToCreate);
          setIsWordExcelImportModalOpen(false);
        }}
        defaultUnit={userProfile.units[0]}
        availableUnits={userProfile.units}
      />

      {/* Word Report (.docx) & Custom Template Modal */}
      <ReportExportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        tasks={tasks}
        userProfile={userProfile}
        initialPeriodType={reportModalPeriod}
      />
    </div>
  );
}
