export interface SubtaskResource {
  title: string;
  url: string;
  description?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  phase?: string;
  resource?: SubtaskResource;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  uploadDate: string;
}

export interface TaskLink {
  id: string;
  title: string;
  url: string;
}

export interface TaskReminder {
  enabled: boolean;
  minutesBefore: number; // e.g. 15, 30, 60, 1440 (1 day)
  notified?: boolean;
}

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type TaskTimeframeFilter = 'all' | 'this_week' | 'this_month' | 'upcoming';

export interface TaskAssigner {
  id?: string;
  name: string;
  birthDate?: string;
  unit?: string;
  phone?: string;
  email?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  unit: string; // Đơn vị thực hiện
  priority: TaskPriority;
  createdAt: string; // ISO string
  dueDate: string; // ISO string (giờ, ngày, tháng, năm)
  completedAt?: string; // ISO string when finished
  subtasks: Subtask[];
  progress: number; // 0 - 100
  status: TaskStatus;
  attachments: TaskAttachment[];
  links: TaskLink[];
  reminder: TaskReminder;
  notes?: string;
  aiAnalysis?: string;
  assigner?: TaskAssigner; // Người giao việc
  googleCalendarEventId?: string; // ID sự kiện trên Google Calendar đã liên kết
  googleCalendarSyncedAt?: string; // Thời điểm đồng bộ gần nhất
  source?: 'app' | 'google_calendar' | 'document_import'; // Phân biệt nguồn dữ liệu
  externalEventData?: {
    summary?: string;
    description?: string;
    location?: string;
    htmlLink?: string;
  };
  tags?: string[]; // Nhãn phân loại nhiệm vụ
}

export interface ConnectedAppItem {
  id: string;
  name: string;
  url: string;
  category: 'calendar' | 'storage' | 'communication' | 'project_management' | 'document' | 'other';
  description: string;
  isConnected: boolean;
  addedAt: string;
  iconKey?: string;
}

export interface UserProfile {
  displayName: string;
  role?: string; // Chức vụ / Vai trò công tác
  weeklyGoal?: number; // Mục tiêu nhiệm vụ hoàn thành mỗi tuần
  birthDate: string; // YYYY-MM-DD
  units: string[]; // Các đơn vị đang sinh hoạt
  avatarUrl: string;
  bio?: string;
  email?: string;
  phone?: string;
  connectedAppsList?: ConnectedAppItem[];
  connectedApps?: {
    googleCalendar: boolean;
    googleDrive: boolean;
    zalo: boolean;
    notion: boolean;
    telegram: boolean;
  };
  notifications: {
    browserEnabled: boolean;
    soundEnabled: boolean;
    priorityReminders: boolean;
    overdueAlerts: boolean;
  };
  defaultAssigner?: TaskAssigner; // Người giao việc mặc định
  assignersList?: TaskAssigner[]; // Danh sách các cán bộ / lãnh đạo giao việc đã lưu
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  password?: string;
  authProvider?: 'password' | 'google' | 'firebase';
  isProfileCompleted: boolean;
  profile: UserProfile;
  createdAt: string;
  lastActiveAt?: string; // Thời điểm hoạt động gần nhất (tự động xóa sau 3 ngày không hoạt động)
  lastSyncedAt?: string;
  syncCode?: string; // Mã kết nối đồng bộ 6 ký tự e.g. 'TM-8492'
  pairedUserId?: string; // ID của tài khoản được liên kết bộ nhớ
  pairedUserName?: string; // Tên hiển thị của tài khoản liên kết
  pairedSyncCode?: string; // Mã kết nối của tài khoản đối tác
  pairedAt?: string; // Thời điểm thiết lập liên kết
}

export interface StrategicOption {
  name: string;
  pros: string;
  cons: string;
  recommended?: boolean;
}

export interface StrategicActionStep {
  step: number;
  action: string;
  deadline?: string;
  focusTask?: string;
}

export interface StrategicConsultationResult {
  analysis: string;
  options: StrategicOption[];
  actionPlan: StrategicActionStep[];
  strategicAdvice: string;
  dataManifest?: {
    overviewIncluded: boolean;
    activeTasksCount: number;
    archivedTasksCount: number;
    analyzedAt: string;
  };
  timestamp?: string;
}

export type BreakdownGranularity = 'standard' | 'detailed' | 'phased';

export interface GapAnalysisItem {
  id: string;
  category: 'completion' | 'subtasks' | 'deadline' | 'unit' | 'attachments';
  title: string;
  description: string;
  recommendation: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface StrategicRecommendation {
  id: string;
  title: string;
  detail: string;
  tag: string;
  impact: 'high' | 'medium' | 'low';
  timeframe?: 'today' | 'this_week' | 'long_term';
}

export interface WeeklyArchiveAnalysis {
  thisWeekCompletedCount: number;
  lastWeekCompletedCount: number;
  earlierCompletedCount: number;
  averageLeadTimeDays: number;
  onTimeCompletionRate: number;
  weeklyVelocity: number; // tasks completed per week average
  weeklySummaryText: string;
}

export interface SystemPragmatismAssessment {
  pragmatismScore: number; // 0 - 100
  pragmatismGrade: string; // e.g., "Rất cao - Thực chiến tối đa"
  subtaskUtilizationRate: number; // % tasks with checklists
  attachmentUtilizationRate: number; // % tasks with attachments
  deadlinePrecisionRate: number; // % tasks with realistic deadlines & reminders
  unitAssignmentRate: number; // % tasks assigned to explicit units
  assessmentSummary: string;
  practicalStrengths: string[];
  practicalGaps: string[];
}

export interface TaskExecutionHealth {
  healthLevel: 'healthy' | 'warning' | 'critical';
  healthLabel: string;
  urgentPendingCount: number;
  overdueCount: number;
  inProgressCount: number;
  executionSummary: string;
  bottlenecks: string[];
  immediateRisks: string[];
}

export interface UserManagementCapability {
  capabilityScore: number; // 0 - 100
  maturityStage: string; // e.g., "Cấp 4: Quản Trị Linh Hoạt & Chiến Lược"
  planningScore: number; // 0 - 100
  executionDisciplineScore: number; // 0 - 100
  deadlineControlScore: number; // 0 - 100
  crossUnitCoordinationScore: number; // 0 - 100
  strengths: string[];
  growthAreas: string[];
  coachingGuidance: string;
}

export interface AIStrategicReview {
  score: number; // 0 - 100 overall productivity index (starts strictly at 0/100 until tasks completed)
  grade: string;
  overallSummary: string;
  completionRate: number;
  onTimeRate: number;
  averageVelocityDays?: number;
  
  // 4 Core Required Pillars
  weeklyArchiveAnalysis: WeeklyArchiveAnalysis;
  systemPragmatism: SystemPragmatismAssessment;
  taskExecution: TaskExecutionHealth;
  userManagement: UserManagementCapability;

  // Gap analysis: Missing elements and targeted strategic fixes
  gaps: GapAnalysisItem[];

  strengths: string[];
  bottlenecks: string[];
  recommendations: StrategicRecommendation[];
  analyzedAt: string;
}

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip?: string;
  lastActive: string;
  loggedInAt: string;
  isCurrentDevice?: boolean;
  status: 'online' | 'idle' | 'revoked';
}

export interface EphemeralPairingSession {
  code: string;
  requesterDeviceId: string;
  requesterDeviceName: string;
  targetUserId: string;
  status: 'pending' | 'claimed' | 'authorized' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
}

export interface StrategicWeeklyAnalysis {
  weeklyVelocity: number; // completed tasks this week
  onTimeRate: number; // percentage
  efficiencyRating: string;
  weeklyExecutiveSummary: string;
  keyAchievements: string[];
  timeWasters: {
    title: string;
    lostHoursEst: number;
    rootCause: string;
    fixAdvice: string;
  }[];
  timeOptimizationPlan: {
    priorityOrder: number;
    actionTitle: string;
    method: string;
    timeSavedHours: number;
    category: string;
  }[];
  dailyDistribution: {
    day: string;
    count: number;
    hoursEst: number;
  }[];
  analyzedAt: string;
}

export interface NoteChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  color: string; // Pastel color hex/class e.g. '#FFFFFF', '#FEF3C7', '#DCFCE7', '#E0E7FF', '#F3E8FF', '#FFE4E6', '#E0F2FE'
  labels: string[]; // e.g. ['Công việc', 'Ý tưởng', 'Cần xử lý', 'Tham khảo']
  checklistItems: NoteChecklistItem[];
  checklist?: NoteChecklistItem[]; // Alias for checklistItems
  linkedTaskIds: string[]; // Actual task IDs linked to this note
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean; // Trash status
  isTrash?: boolean; // Alias for isDeleted
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteColorOption {
  id: string;
  name: string;
  bgClass: string;
  borderClass: string;
  hex: string;
}

export const NOTE_COLOR_PALETTES: NoteColorOption[] = [
  { id: 'white', name: 'Trắng tinh khôi', bgClass: 'bg-white', borderClass: 'border-slate-200', hex: '#FFFFFF' },
  { id: 'amber', name: 'Vàng pastel nhẹ', bgClass: 'bg-amber-50/90', borderClass: 'border-amber-200', hex: '#FEF3C7' },
  { id: 'emerald', name: 'Xanh ngọc bạc hà', bgClass: 'bg-emerald-50/90', borderClass: 'border-emerald-200', hex: '#DCFCE7' },
  { id: 'sky', name: 'Xanh da trời dịu', bgClass: 'bg-sky-50/90', borderClass: 'border-sky-200', hex: '#E0F2FE' },
  { id: 'indigo', name: 'Tím oải hương', bgClass: 'bg-indigo-50/90', borderClass: 'border-indigo-200', hex: '#E0E7FF' },
  { id: 'purple', name: 'Tím pastel trang nhã', bgClass: 'bg-purple-50/90', borderClass: 'border-purple-200', hex: '#F3E8FF' },
  { id: 'rose', name: 'Hồng phấn nhạt', bgClass: 'bg-rose-50/90', borderClass: 'border-rose-200', hex: '#FFE4E6' },
  { id: 'slate', name: 'Xám khói thanh lịch', bgClass: 'bg-slate-50/90', borderClass: 'border-slate-300', hex: '#F1F5F9' },
];

export const DEFAULT_NOTE_LABELS = [
  'Công việc',
  'Ý tưởng',
  'Cá nhân',
  'Cần xử lý',
  'Tham khảo',
  'Cuộc họp',
  'Khác'
];

/**
 * -----------------------------------------------------------------------------
 * Google Calendar Two-Way Sync Types
 * -----------------------------------------------------------------------------
 */
export interface ExternalCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  status?: string;
  updated?: string;
  location?: string;
  isExternalOnly: boolean; // true if from external Google Calendar and not yet converted to internal task
  linkedTaskId?: string;
}

export interface GoogleCalendarSyncState {
  isConnected: boolean;
  userEmail?: string;
  lastSyncedAt?: string;
  autoSyncEnabled: boolean;
  timeZone: string; // 'Asia/Ho_Chi_Minh'
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
  syncedEventsCount: number;
  externalEventsCount: number;
}

/**
 * -----------------------------------------------------------------------------
 * Module Tài Liệu & Liên Kết (Document & Link Repository)
 * -----------------------------------------------------------------------------
 */
export type DocumentFormatType = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'other';

export interface AppDocument {
  id: string;
  name: string; // Display title
  originalName: string;
  size: number; // File size in bytes
  type: string; // MIME type
  format: DocumentFormatType;
  url: string; // Download / View URL
  uploadDate: string; // ISO String
  ownerId: string;
  ownerName?: string;
  taskId?: string; // Optional: linked task id
  taskTitle?: string;
  description?: string;
  folder?: string; // Tên thư mục phân loại tài liệu
}

export interface AppExternalLink {
  id: string;
  title: string;
  url: string;
  notes?: string;
  taskId?: string; // Optional: linked task id
  taskTitle?: string;
  createdAt: string;
  ownerId: string;
}

/**
 * -----------------------------------------------------------------------------
 * Word & Excel Batch Import Types
 * -----------------------------------------------------------------------------
 */
export interface ImportedCandidateTask {
  tempId: string;
  title: string;
  unit: string;
  dueDate: string;
  priority: TaskPriority;
  description: string;
  subtasks: string[];
  links: { title: string; url: string }[];
  addToGoogleCalendar: boolean;
  validationErrors: string[];
  isCertain: boolean;
  rawRowIndex?: number;
}

export interface DocumentTableStructure {
  tableIndex: number;
  title?: string;
  headers: string[];
  rowCount: number;
  sampleRows: string[][];
}

/**
 * -----------------------------------------------------------------------------
 * Word Report & Custom Template Types
 * -----------------------------------------------------------------------------
 */
export type ReportPeriodType = 'month' | 'year' | 'custom';

export interface ReportTemplate {
  id: string;
  name: string;
  originalName: string;
  description?: string;
  placeholders: string[];
  createdAt: string;
  isDefault?: boolean;
  diskFileName: string;
  fileSize: number;
}

export interface ReportFilterConfig {
  periodType: ReportPeriodType;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  unit: string;
  title: string;
}

export interface ReportStatistics {
  totalTasks: number;
  completedTasks: number;
  completedOnTime: number;
  completedLate: number;
  inProgressTasks: number;
  backlogTasks: number;
  onTimeRate: number;
  completionRate: number;
}

export type DocxTemplateLayout = 'executive_summary' | 'detailed_tasks' | 'project_timeline';

export interface DocFolder {
  id: string;
  name: string;
  linkedNoteId?: string;
  linkedNoteTitle?: string;
  description?: string;
  createdAt: string;
}

export interface WordReportCustomConfig {
  templateLayout?: DocxTemplateLayout;
  fontFamily: 'Times New Roman' | 'Arial' | 'Calibri' | 'Roboto';
  fontSizePt: number;
  lineSpacing: number;
  primaryColor: string;
  hasBorderBox: boolean;
  autoItalicParentheses: boolean;
  governingBody: string;
  issuingAgency: string;
  docNumber: string;
  locationAndDate: string;
  reportTitle: string;
  reportSubtitle: string;
  section1Title: string;
  section2Title: string;
  aiSummary: string;
  futureDirections: string;
  section3Title: string;
  signatoryTitle: string;
  signatoryNote: string;
  signatoryName: string;
  recipientList: string;
}

export interface ExcelCustomConfig {
  sheetName: string;
  tableTitle: string;
  fontFamily: 'Times New Roman' | 'Arial' | 'Calibri' | 'Tahoma';
  fontSizePt: number;
  headerFillColor: string;
  headerTextColor: string;
  hasBorders: boolean;
  wrapText: boolean;
  autoItalicParentheses: boolean;
  columns: Array<{ id: string; label: string; width: number; isLocked?: boolean }>;
  rows: Array<Record<string, any>>;
}
