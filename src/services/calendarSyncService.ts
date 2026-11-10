import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Task, ExternalCalendarEvent, GoogleCalendarSyncState } from '../types/task';

export const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

// In-memory token cache (NEVER stored in localStorage per workspace-integration security guidelines)
let inMemoryCalendarToken: string | null = null;

const SYNC_STATE_STORAGE_KEY = 'taskmaster_gcal_sync_state';

export function getStoredSyncState(): GoogleCalendarSyncState {
  try {
    const raw = localStorage.getItem(SYNC_STATE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isConnected: !!parsed.isConnected,
        userEmail: parsed.userEmail || undefined,
        lastSyncedAt: parsed.lastSyncedAt || undefined,
        autoSyncEnabled: parsed.autoSyncEnabled ?? true,
        timeZone: DEFAULT_TIMEZONE,
        syncStatus: 'idle',
        syncedEventsCount: parsed.syncedEventsCount || 0,
        externalEventsCount: parsed.externalEventsCount || 0,
      };
    }
  } catch {}

  return {
    isConnected: false,
    autoSyncEnabled: true,
    timeZone: DEFAULT_TIMEZONE,
    syncStatus: 'idle',
    syncedEventsCount: 0,
    externalEventsCount: 0,
  };
}

export function saveStoredSyncState(state: Partial<GoogleCalendarSyncState>): void {
  try {
    const current = getStoredSyncState();
    const updated = { ...current, ...state };
    localStorage.setItem(
      SYNC_STATE_STORAGE_KEY,
      JSON.stringify({
        isConnected: updated.isConnected,
        userEmail: updated.userEmail,
        lastSyncedAt: updated.lastSyncedAt,
        autoSyncEnabled: updated.autoSyncEnabled,
        syncedEventsCount: updated.syncedEventsCount,
        externalEventsCount: updated.externalEventsCount,
      })
    );
  } catch {}
}

export function getCalendarAccessToken(): string | null {
  return inMemoryCalendarToken;
}

export function setCalendarAccessToken(token: string | null): void {
  inMemoryCalendarToken = token;
}

/**
 * Connect Google Calendar using GoogleAuthProvider with calendar.events scope
 */
export async function connectGoogleCalendar(): Promise<{ email: string; token: string }> {
  const provider = new GoogleAuthProvider();
  CALENDAR_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error('Không nhận được mã xác thực Google Calendar từ tài khoản Google.');
    }

    inMemoryCalendarToken = accessToken;
    const userEmail = result.user.email || 'user@gmail.com';

    saveStoredSyncState({
      isConnected: true,
      userEmail,
      lastSyncedAt: new Date().toISOString(),
    });

    return { email: userEmail, token: accessToken };
  } catch (err: any) {
    if (
      err.code === 'auth/unauthorized-domain' ||
      (typeof err.message === 'string' && err.message.toLowerCase().includes('unauthorized-domain'))
    ) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'hiện tại';
      throw new Error(
        `Tên miền ${currentHost} chưa được ủy quyền trong Firebase Auth (auth/unauthorized-domain). Bạn vui lòng thêm miền vào Authorized Domains trong Firebase Console hoặc sử dụng chức năng tải/đồng bộ tệp lịch .ICS.`
      );
    }
    throw err;
  }
}

/**
 * Disconnect Google Calendar without losing any original app tasks
 */
export function disconnectGoogleCalendar(): void {
  inMemoryCalendarToken = null;
  saveStoredSyncState({
    isConnected: false,
    syncStatus: 'idle',
  });
}

/**
 * Format date for Google Calendar event in Asia/Ho_Chi_Minh
 */
function toCalendarDateTime(isoString: string): { dateTime: string; timeZone: string } {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 3);
    return {
      dateTime: fallback.toISOString(),
      timeZone: DEFAULT_TIMEZONE,
    };
  }
  return {
    dateTime: date.toISOString(),
    timeZone: DEFAULT_TIMEZONE,
  };
}

/**
 * 1. Fetch events from Google Calendar
 */
export async function fetchGoogleCalendarEvents(
  token: string,
  timeMin?: string,
  timeMax?: string
): Promise<ExternalCalendarEvent[]> {
  const now = new Date();
  const min = timeMin || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const max = timeMax || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', min);
  url.searchParams.set('timeMax', max);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('timeZone', DEFAULT_TIMEZONE);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 401) {
    inMemoryCalendarToken = null;
    throw new Error('Phiên đăng nhập Google Calendar đã hết hạn. Vui lòng kết nối lại.');
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Lỗi truy vấn Google Calendar (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  return items.map((item: any) => ({
    id: item.id,
    summary: item.summary || '(Không có tiêu đề)',
    description: item.description || '',
    start: item.start || {},
    end: item.end || {},
    htmlLink: item.htmlLink,
    status: item.status,
    updated: item.updated,
    location: item.location,
    isExternalOnly: true,
  }));
}

/**
 * 2. Create single event on Google Calendar
 */
export async function createGoogleCalendarEvent(
  token: string,
  task: Task
): Promise<string> {
  const start = toCalendarDateTime(task.createdAt || new Date().toISOString());
  const end = toCalendarDateTime(task.dueDate || new Date(Date.now() + 3600000).toISOString());

  // Ensure end is strictly after start
  if (new Date(end.dateTime).getTime() <= new Date(start.dateTime).getTime()) {
    const adjustedEnd = new Date(new Date(start.dateTime).getTime() + 3600000);
    end.dateTime = adjustedEnd.toISOString();
  }

  const subtasksList = task.subtasks && task.subtasks.length > 0
    ? '\n\nDanh sách các bước thực hiện:\n' + task.subtasks.map((st, i) => `${i + 1}. [${st.completed ? 'X' : ' '}] ${st.title}`).join('\n')
    : '';

  const assignerInfo = task.assigner?.name
    ? `\nNgười giao việc: ${task.assigner.name} (${task.assigner.unit || ''} - ${task.assigner.phone || ''})`
    : '';

  const description = `${task.description || 'Nhiệm vụ từ NSTask'}\n\nĐơn vị phụ trách: ${task.unit || 'Chung'}${assignerInfo}${subtasksList}\n\nTrạng thái: ${task.status === 'completed' ? 'Đã hoàn thành' : 'Đang thực hiện'}\nTiến độ: ${task.progress || 0}%\n---\nĐược đồng bộ tự động từ NSTask`;

  const body = {
    summary: `[${task.unit || 'NSTask'}] ${task.title}`,
    description,
    start,
    end,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: task.reminder?.minutesBefore || 60 },
        { method: 'email', minutes: 1440 },
      ],
    },
    extendedProperties: {
      private: {
        taskMasterTaskId: task.id,
        taskMasterSyncSource: 'taskmaster_app',
      },
    },
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Lỗi tạo sự kiện trên Google Calendar: ${errText}`);
  }

  const created = await res.json();
  return created.id;
}

/**
 * 3. Update existing event on Google Calendar
 */
export async function updateGoogleCalendarEvent(
  token: string,
  eventId: string,
  task: Task
): Promise<void> {
  const start = toCalendarDateTime(task.createdAt || new Date().toISOString());
  const end = toCalendarDateTime(task.dueDate || new Date(Date.now() + 3600000).toISOString());

  if (new Date(end.dateTime).getTime() <= new Date(start.dateTime).getTime()) {
    const adjustedEnd = new Date(new Date(start.dateTime).getTime() + 3600000);
    end.dateTime = adjustedEnd.toISOString();
  }

  const subtasksList = task.subtasks && task.subtasks.length > 0
    ? '\n\nDanh sách các bước thực hiện:\n' + task.subtasks.map((st, i) => `${i + 1}. [${st.completed ? 'X' : ' '}] ${st.title}`).join('\n')
    : '';

  const assignerInfo = task.assigner?.name
    ? `\nNgười giao việc: ${task.assigner.name} (${task.assigner.unit || ''} - ${task.assigner.phone || ''})`
    : '';

  const description = `${task.description || 'Nhiệm vụ từ NSTask'}\n\nĐơn vị: ${task.unit || 'Chung'}${assignerInfo}${subtasksList}\n\nTrạng thái: ${task.status === 'completed' ? 'Đã hoàn thành' : 'Đang thực hiện'}\nTiến độ: ${task.progress || 0}%\n---\nĐược cập nhật tự động từ NSTask`;

  const body = {
    summary: `[${task.unit || 'NSTask'}] ${task.title}`,
    description,
    start,
    end,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: task.reminder?.minutesBefore || 60 },
      ],
    },
    extendedProperties: {
      private: {
        taskMasterTaskId: task.id,
        taskMasterSyncSource: 'taskmaster_app',
      },
    },
  };

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 404) {
    // If deleted on Google Calendar, re-create event
    const newId = await createGoogleCalendarEvent(token, task);
    task.googleCalendarEventId = newId;
    return;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Lỗi cập nhật sự kiện Google Calendar: ${errText}`);
  }
}

/**
 * 4. Delete event from Google Calendar with user confirmation support
 */
export async function deleteGoogleCalendarEvent(
  token: string,
  eventId: string
): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Lỗi xóa sự kiện trên Google Calendar: ${errText}`);
  }
}

/**
 * 5. Full Two-Way Synchronization Engine
 * - Push: Syncs app tasks with Google Calendar (creates or updates linked events)
 * - Pull: Fetches Google Calendar events. Updates linked tasks; displays external events separately
 * - Preserves original tasks if disconnect happens
 * - Guarantees Asia/Ho_Chi_Minh time consistency
 */
export async function performTwoWayCalendarSync(
  tasks: Task[]
): Promise<{
  updatedTasks: Task[];
  externalEvents: ExternalCalendarEvent[];
  syncedCount: number;
  lastSyncedAt: string;
}> {
  const token = getCalendarAccessToken();
  if (!token) {
    throw new Error('Chưa kết nối Google Calendar. Vui lòng bấm "Kết nối Google Calendar" để cấp quyền.');
  }

  const nowIso = new Date().toISOString();
  let syncedCount = 0;
  const updatedTasks = [...tasks];

  // 1. Fetch remote events from Google Calendar
  const remoteEvents = await fetchGoogleCalendarEvents(token);

  // Map remote events by ID
  const remoteEventsById = new Map<string, ExternalCalendarEvent>();
  remoteEvents.forEach((ev) => remoteEventsById.set(ev.id, ev));

  // 2. Push App Tasks to Google Calendar (Update or Create)
  for (let i = 0; i < updatedTasks.length; i++) {
    const task = updatedTasks[i];
    // Sync all tasks with reminder enabled OR already linked to Google Calendar
    if (task.reminder?.enabled || task.googleCalendarEventId) {
      try {
        if (task.googleCalendarEventId && remoteEventsById.has(task.googleCalendarEventId)) {
          // Event already exists on Google Calendar -> Check for remote modifications
          const remoteEv = remoteEventsById.get(task.googleCalendarEventId)!;
          const remoteUpdated = remoteEv.updated ? new Date(remoteEv.updated).getTime() : 0;
          const localSynced = task.googleCalendarSyncedAt ? new Date(task.googleCalendarSyncedAt).getTime() : 0;

          if (remoteUpdated > localSynced + 5000) {
            // Remote event was updated on Google Calendar more recently -> Update local task
            const cleanSummary = remoteEv.summary.replace(/^\[.*?\]\s*/, '').trim();
            if (cleanSummary && cleanSummary !== task.title) {
              task.title = cleanSummary;
            }
            if (remoteEv.description && !task.description) {
              task.description = remoteEv.description;
            }
            if (remoteEv.end?.dateTime) {
              task.dueDate = remoteEv.end.dateTime;
            }
          } else {
            // Local task is newer or equal -> Push local updates to Google Calendar
            await updateGoogleCalendarEvent(token, task.googleCalendarEventId, task);
          }
        } else {
          // Needs creation on Google Calendar
          const newEventId = await createGoogleCalendarEvent(token, task);
          task.googleCalendarEventId = newEventId;
        }

        task.googleCalendarSyncedAt = nowIso;
        syncedCount++;
      } catch (pushErr) {
        console.warn(`[GCal Sync] Không thể đồng bộ nhiệm vụ "${task.title}":`, pushErr);
      }
    }
  }

  // 3. Identify External-Only Google Calendar events (not generated from internal tasks)
  const linkedEventIds = new Set(
    updatedTasks
      .filter((t) => Boolean(t.googleCalendarEventId))
      .map((t) => t.googleCalendarEventId!)
  );

  const externalEvents: ExternalCalendarEvent[] = [];
  remoteEvents.forEach((ev) => {
    if (!linkedEventIds.has(ev.id)) {
      externalEvents.push({
        ...ev,
        isExternalOnly: true,
      });
    }
  });

  saveStoredSyncState({
    isConnected: true,
    lastSyncedAt: nowIso,
    syncedEventsCount: syncedCount,
    externalEventsCount: externalEvents.length,
  });

  return {
    updatedTasks,
    externalEvents,
    syncedCount,
    lastSyncedAt: nowIso,
  };
}
