import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Paperclip,
  Link as LinkIcon,
  ExternalLink,
  Check,
  Building2,
  CalendarCheck2,
  Download,
  Edit3,
  Wand2,
  CheckCircle2,
  User,
  UserCheck,
  Phone,
  Mail,
  FileSpreadsheet,
  FileText,
  UploadCloud,
  AlertCircle,
  Folder,
  FolderPlus,
  FolderUp,
  Upload
} from 'lucide-react';
import { Task, Subtask, TaskAttachment, TaskLink, TaskPriority, UserProfile, TaskAssigner } from '../types/task';
import {
  calculateProgress,
  generateGoogleCalendarUrl,
  generateIcsContent,
  toDatetimeLocal,
  safeToIsoString
} from '../utils/taskCalculations';
import { generateDynamicSubtasks } from '../utils/aiTaskGenerator';
import { BirthDateInput } from './BirthDateInput';
import { downloadExcelTaskTemplate, parseExcelTasks } from '../utils/excelTemplate';
import { parseDocumentTasks } from '../utils/documentTaskParser';
import { FormattingToolbar } from './FormattingToolbar';
import { FormattedContentRenderer } from './FormattedContentRenderer';
import { VoiceInputButton } from './VoiceInputButton';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Task) => void;
  onBatchCreateTasks?: (tasks: Task[]) => void;
  initialTask?: Task | null;
  defaultDueDate?: string;
  userProfile: UserProfile;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  onBatchCreateTasks,
  initialTask,
  defaultDueDate,
  userProfile,
}) => {
  const isEditing = Boolean(initialTask);

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isPreviewingDescription, setIsPreviewingDescription] = useState(false);
  const [unit, setUnit] = useState(initialTask?.unit || (userProfile.units[0] || 'Ban Thanh Niên'));
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority || 'medium');

  // Người giao việc (Assigner) State
  const [assigner, setAssigner] = useState<TaskAssigner>(() => {
    return (
      initialTask?.assigner ||
      userProfile.defaultAssigner || {
        name: '',
        birthDate: '',
        unit: initialTask?.unit || userProfile.units[0] || '',
        phone: '',
        email: '',
      }
    );
  });

  // File Upload & Analysis State (Word / Excel / PDF)
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [fileAnalysisNotice, setFileAnalysisNotice] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<Task[]>([]);
  const [showExtractedModal, setShowExtractedModal] = useState(false);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);
  const taskFolderInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedAttachmentFolder, setSelectedAttachmentFolder] = useState<string>('all');
  const [newFolderNameInput, setNewFolderNameInput] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);

  // Timelines
  const defaultDue = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const [createdAt, setCreatedAt] = useState(
    initialTask?.createdAt ? toDatetimeLocal(new Date(initialTask.createdAt)) : toDatetimeLocal(new Date())
  );
  const [dueDate, setDueDate] = useState(
    initialTask?.dueDate
      ? toDatetimeLocal(new Date(initialTask.dueDate))
      : defaultDueDate
      ? toDatetimeLocal(new Date(defaultDueDate))
      : toDatetimeLocal(defaultDue)
  );

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>(
    initialTask?.subtasks || [
      { id: 'sub-1', title: 'Khảo sát và chuẩn bị các thông tin cần thiết', phase: 'Chuẩn bị', completed: false },
      { id: 'sub-2', title: 'Triển khai thực hiện các phần việc trọng tâm', phase: 'Thực hiện', completed: false },
    ]
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Editing Subtask Inline State
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskPhase, setEditSubtaskPhase] = useState('');
  const [editSubtaskDocTitle, setEditSubtaskDocTitle] = useState('');
  const [editSubtaskDocUrl, setEditSubtaskDocUrl] = useState('');

  // Attachments & Links
  const [attachments, setAttachments] = useState<TaskAttachment[]>(initialTask?.attachments || []);
  const [links, setLinks] = useState<TaskLink[]>(initialTask?.links || []);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Reminder & Calendar
  const [reminderEnabled, setReminderEnabled] = useState(initialTask?.reminder?.enabled ?? true);
  const [reminderMinutes, setReminderMinutes] = useState(initialTask?.reminder?.minutesBefore || 60);

  // AI Analysis summary state & editing
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(initialTask?.aiAnalysis || null);
  const [isEditingAiAnalysis, setIsEditingAiAnalysis] = useState(false);
  const [customAiAnalysisInput, setCustomAiAnalysisInput] = useState('');

  // AI Refine Task Preview State
  const [isRefiningTask, setIsRefiningTask] = useState(false);
  const [refinedTaskPreview, setRefinedTaskPreview] = useState<{
    refinedTitle: string;
    refinedDescription: string;
    keySuggestions: string[];
  } | null>(null);

  // AI loading states
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [breakdownMode, setBreakdownMode] = useState<'phased' | 'standard' | 'detailed' | 'deliverables'>('phased');
  const [breakdownAppend, setBreakdownAppend] = useState(false);
  const [showBreakdownOptions, setShowBreakdownOptions] = useState(false);
  const [breakdownSuccessMsg, setBreakdownSuccessMsg] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAddingNewUnit, setIsAddingNewUnit] = useState(false);
  const [customUnitInput, setCustomUnitInput] = useState('');

  const prevIsOpenRef = React.useRef(false);

  // Synchronize on open transition or initialTask switch
  React.useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (justOpened) {
      if (initialTask) {
        setTitle(initialTask.title || '');
        setDescription(initialTask.description || '');
        setUnit(initialTask.unit || (userProfile.units[0] || 'Ban Thanh Niên'));
        setPriority(initialTask.priority || 'medium');
        setCreatedAt(toDatetimeLocal(new Date(initialTask.createdAt)));
        setDueDate(toDatetimeLocal(new Date(initialTask.dueDate)));
        setSubtasks(initialTask.subtasks || []);
        setAiAnalysis(initialTask.aiAnalysis || null);
        setCustomAiAnalysisInput(initialTask.aiAnalysis || '');
        setAttachments(initialTask.attachments || []);
        setLinks(initialTask.links || []);
        setReminderEnabled(initialTask.reminder?.enabled ?? true);
        setReminderMinutes(initialTask.reminder?.minutesBefore || 60);
        setAssigner(
          initialTask.assigner ||
            userProfile.defaultAssigner || {
              name: '',
              birthDate: '',
              unit: initialTask.unit || userProfile.units[0] || '',
              phone: '',
              email: '',
            }
        );
      } else {
        setTitle('');
        setDescription('');
        setUnit(userProfile.units[0] || 'Ban Thanh Niên');
        setPriority('medium');
        setCreatedAt(toDatetimeLocal(new Date()));
        const targetDue = defaultDueDate ? new Date(defaultDueDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        setDueDate(toDatetimeLocal(targetDue));
        setAiAnalysis(null);
        setCustomAiAnalysisInput('');
        setSubtasks([
          { id: 'sub-1', title: 'Tôi chuẩn bị kế hoạch cá nhân và tài liệu cần thiết', phase: 'Chuẩn bị', completed: false },
          { id: 'sub-2', title: 'Tôi trực tiếp triển khai các phần việc trọng tâm theo tiến độ', phase: 'Thực hiện', completed: false },
        ]);
        setAttachments([]);
        setLinks([]);
        setReminderEnabled(true);
        setReminderMinutes(60);
        setAssigner(
          userProfile.defaultAssigner || {
            name: '',
            birthDate: '',
            unit: userProfile.units[0] || '',
            phone: '',
            email: '',
          }
        );
      }
      setAiError(null);
      setEditingSubtaskId(null);
      setRefinedTaskPreview(null);
      setIsEditingAiAnalysis(false);
      setFileAnalysisNotice(null);
      setExtractedTasks([]);
      setShowExtractedModal(false);
    }
  }, [isOpen, initialTask, defaultDueDate, userProfile]);

  if (!isOpen) return null;

  const liveProgress = calculateProgress(subtasks);

  // AI: Refine Task (Ngôn từ gần gũi, đơn giản dễ hiểu, phân tích tiêu đề và mô tả)
  const handleRefineTaskWithAI = async () => {
    if (!title.trim() && !description.trim()) {
      setAiError('Vui lòng nhập tên nhiệm vụ hoặc mô tả để AI phân tích và tinh chỉnh.');
      return;
    }
    setAiError(null);
    setIsRefiningTask(true);
    setRefinedTaskPreview(null);

    try {
      const res = await fetch('/api/ai/refine-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          unit,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRefinedTaskPreview(data);
      } else {
        throw new Error('API server returned error');
      }
    } catch {
      // Friendly local fallback
      const cleanT = title.trim() || 'Nhiệm vụ mới';
      setRefinedTaskPreview({
        refinedTitle: cleanT,
        refinedDescription: `Kế hoạch hành động tôi trực tiếp thực hiện cho nhiệm vụ "${cleanT}" (phân loại mảng việc cho ${unit}). Tôi chủ động chuẩn bị hồ sơ, trực tiếp giải quyết các bước cốt lõi và bàn giao kết quả đúng hạn.`,
        keySuggestions: [
          'Tôi chủ động chuẩn bị tài liệu mẫu và xin ý kiến định hướng sớm để không bị động',
          'Tôi đặt mốc hoàn thành trước hạn 24 giờ để kịp rà soát chất lượng đầu ra',
          'Tôi lưu trữ đầy đủ biên bản, hồ sơ minh chứng để nghiệm thu thuận lợi',
        ],
      });
    } finally {
      setIsRefiningTask(false);
    }
  };

  // Apply Refined Task Suggestions
  const handleApplyRefinedSuggestions = () => {
    if (!refinedTaskPreview) return;
    if (refinedTaskPreview.refinedTitle) setTitle(refinedTaskPreview.refinedTitle);
    if (refinedTaskPreview.refinedDescription) setDescription(refinedTaskPreview.refinedDescription);
    setBreakdownSuccessMsg('Đã áp dụng tên và mô tả tinh chỉnh chuyên nghiệp!');
    setRefinedTaskPreview(null);
    setTimeout(() => setBreakdownSuccessMsg(null), 3000);
  };

  // AI: Generate Description (Ngôn từ gần gũi, đơn giản dễ hiểu)
  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      setAiError('Vui lòng nhập tên nhiệm vụ trước để AI có thể phân tích và viết mô tả.');
      return;
    }
    setAiError(null);
    setIsGeneratingDesc(true);
    const cleanT = title.trim();
    const cleanU = unit || userProfile.units[0] || 'đơn vị phụ trách';
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cleanT, unit: cleanU, existingDescription: description }),
      });
      const data = await res.json();
      if (data && data.description) {
        setDescription(data.description);
      } else {
        setDescription(
          `Kế hoạch hành động cá nhân tôi trực tiếp triển khai cho nhiệm vụ "${cleanT}" (thuộc mảng việc cho ${cleanU}). Tôi chủ động chuẩn bị tài liệu, triển khai các nội dung trọng tâm và bàn giao kết quả nghiệm thu đúng hạn.`
        );
      }
    } catch {
      setDescription(
        `Kế hoạch hành động cá nhân tôi trực tiếp triển khai cho nhiệm vụ "${cleanT}" (thuộc mảng việc cho ${cleanU}). Tôi chủ động chuẩn bị tài liệu, triển khai các nội dung trọng tâm và bàn giao kết quả nghiệm thu đúng hạn.`
      );
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  // AI: Phân rã nhiệm vụ lớn (WBS)
  const handleBreakdownTask = async (customGranularity?: 'phased' | 'standard' | 'detailed' | 'deliverables') => {
    if (!title.trim() && !description.trim()) {
      setAiError('Vui lòng nhập tên nhiệm vụ hoặc dán nội dung mô tả để AI nghiên cứu và phân rã.');
      return;
    }
    setAiError(null);
    setBreakdownSuccessMsg(null);
    setIsGeneratingSubtasks(true);
    const chosenGranularity = customGranularity || breakdownMode;

    try {
      const res = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          unit,
          granularity: chosenGranularity,
        }),
      });

      if (!res.ok) throw new Error('API server returned error');
      const data = await res.json();

      if (data && data.analysis) {
        setAiAnalysis(data.analysis);
        setCustomAiAnalysisInput(data.analysis);
      }

      if (Array.isArray(data.subtasks) && data.subtasks.length > 0) {
        const mappedSubtasks: Subtask[] = data.subtasks.map((st: any, i: number) => ({
          id: `ai-wbs-${Date.now()}-${i}`,
          title: st.title,
          phase: st.phase || undefined,
          completed: Boolean(st.completed),
          resource: st.resource
            ? {
                title: st.resource.title,
                url: st.resource.url,
                description: st.resource.description,
              }
            : undefined,
        }));

        if (breakdownAppend) {
          setSubtasks((prev) => [...prev, ...mappedSubtasks]);
          setBreakdownSuccessMsg(`Đã bổ sung ${mappedSubtasks.length} đầu việc con do AI gợi ý (Bạn có thể tự do chỉnh sửa)!`);
        } else {
          setSubtasks(mappedSubtasks);
          setBreakdownSuccessMsg(`Đã phân rã ${mappedSubtasks.length} đầu việc con rõ ràng (Bạn có thể tự do chỉnh sửa)!`);
        }
        setShowBreakdownOptions(false);
      } else {
        throw new Error('Danh sách phân rã rỗng');
      }
    } catch {
      const t = title.trim() || 'Nhiệm vụ trọng tâm';
      const cleanU = unit || userProfile.units[0] || 'đơn vị';
      const dynamicResult = generateDynamicSubtasks(t, cleanU, chosenGranularity);

      setAiAnalysis(dynamicResult.analysis);
      setCustomAiAnalysisInput(dynamicResult.analysis);

      const fallbackList: Subtask[] = dynamicResult.subtasks.map((st, i) => ({
        id: `fb-wbs-${Date.now()}-${i}`,
        title: st.title,
        phase: st.phase,
        completed: false,
        resource: st.resource
          ? {
              title: st.resource.title,
              url: st.resource.url,
              description: st.resource.description,
            }
          : undefined,
      }));

      if (breakdownAppend) {
        setSubtasks((prev) => [...prev, ...fallbackList]);
      } else {
        setSubtasks(fallbackList);
      }
      setBreakdownSuccessMsg(`AI đã phân tích tên nhiệm vụ "${t}" và tạo ${fallbackList.length} việc con phù hợp!`);
      setShowBreakdownOptions(false);
    } finally {
      setIsGeneratingSubtasks(false);
      setTimeout(() => setBreakdownSuccessMsg(null), 4000);
    }
  };

  // Toggle subtask checkbox
  const handleToggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  // Edit subtask inline
  const handleStartEditSubtask = (s: Subtask) => {
    setEditingSubtaskId(s.id);
    setEditSubtaskTitle(s.title);
    setEditSubtaskPhase(s.phase || 'Thực hiện');
    setEditSubtaskDocTitle(s.resource?.title || '');
    setEditSubtaskDocUrl(s.resource?.url || '');
  };

  const handleSaveEditSubtask = () => {
    if (!editingSubtaskId || !editSubtaskTitle.trim()) return;

    setSubtasks((prev) =>
      prev.map((s) => {
        if (s.id !== editingSubtaskId) return s;
        return {
          ...s,
          title: editSubtaskTitle.trim(),
          phase: editSubtaskPhase.trim() || undefined,
          resource: editSubtaskDocTitle.trim()
            ? {
                title: editSubtaskDocTitle.trim(),
                url: editSubtaskDocUrl.trim() || `https://www.google.com/search?q=${encodeURIComponent(editSubtaskDocTitle.trim())}`,
                description: s.resource?.description,
              }
            : undefined,
        };
      })
    );

    setEditingSubtaskId(null);
  };

  const handleCancelEditSubtask = () => {
    setEditingSubtaskId(null);
  };

  // Add manual subtask
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { id: `sub-${Date.now()}`, title: newSubtaskTitle.trim(), phase: 'Thực hiện', completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  // Save AI Analysis edits
  const handleSaveAiAnalysisEdit = () => {
    setAiAnalysis(customAiAnalysisInput.trim() || null);
    setIsEditingAiAnalysis(false);
  };

  // File upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const newAtt: TaskAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: uploadEvent.target?.result as string,
          uploadDate: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.name.startsWith('.') || file.size === 0) return;
      const relPath = (file as any).webkitRelativePath || file.name;
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const newAtt: TaskAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: relPath,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: uploadEvent.target?.result as string,
          uploadDate: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
    if (taskFolderInputRef.current) taskFolderInputRef.current.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Links management
  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    let formattedUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    setLinks((prev) => [
      ...prev,
      {
        id: `link-${Date.now()}`,
        title: newLinkTitle.trim() || formattedUrl,
        url: formattedUrl,
      },
    ]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleRemoveLink = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  // Handlers for File Upload & Template Download (Word, Excel, PDF)
  const handleDownloadTemplate = () => {
    downloadExcelTaskTemplate();
  };

  const handleFileUploadAndParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingFile(true);
    setFileAnalysisNotice(null);
    setAiError(null);

    try {
      const fileName = file.name.toLowerCase();
      let parsedTasks: Task[] = [];

      const mapParsedToTask = (p: any): Task => ({
        id: p.id || `import-task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: p.title || 'Nhiệm vụ mới',
        description: p.description || '',
        unit: unit || userProfile.units[0] || 'Ban Thanh Niên',
        priority: p.priority || 'medium',
        createdAt: p.createdAt || new Date().toISOString(),
        dueDate: p.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        subtasks: Array.isArray(p.subtasks) ? p.subtasks : [],
        progress: 0,
        status: 'pending',
        attachments: [],
        links: Array.isArray(p.links) ? p.links : [],
        reminder: { enabled: !!p.addToGoogleCalendar, minutesBefore: 60 },
        assigner: assigner.name ? assigner : undefined,
      });

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        const raw = await parseExcelTasks(file);
        parsedTasks = raw.map(mapParsedToTask);
      } else if (
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc') ||
        fileName.endsWith('.pdf') ||
        fileName.endsWith('.txt')
      ) {
        const raw = await parseDocumentTasks(file);
        parsedTasks = raw.map(mapParsedToTask);
      } else {
        setAiError('Định dạng tệp không được hỗ trợ. Vui lòng tải lên file Word (.docx, .doc), Excel (.xlsx, .xls) hoặc PDF (.pdf).');
        setIsAnalyzingFile(false);
        return;
      }

      if (!parsedTasks || parsedTasks.length === 0) {
        setAiError('Không trích xuất được nhiệm vụ nào từ tệp tin vừa tải lên.');
      } else if (parsedTasks.length === 1) {
        // Auto fill into current form
        const t = parsedTasks[0];
        if (t.title) setTitle(t.title);
        if (t.description) setDescription(t.description);
        if (t.unit) setUnit(t.unit);
        if (t.subtasks && t.subtasks.length > 0) setSubtasks(t.subtasks);
        if (t.createdAt) setCreatedAt(toDatetimeLocal(new Date(t.createdAt)));
        if (t.dueDate) setDueDate(toDatetimeLocal(new Date(t.dueDate)));
        if (t.links && t.links.length > 0) setLinks(t.links);
        setFileAnalysisNotice(`✓ Đã phân tích thành công và tự động điền nhiệm vụ "${t.title}" vào biểu mẫu!`);
        setTimeout(() => setFileAnalysisNotice(null), 5000);
      } else {
        // Multiple tasks extracted!
        setExtractedTasks(parsedTasks);
        setShowExtractedModal(true);
        setFileAnalysisNotice(`✓ Đã tìm thấy ${parsedTasks.length} nhiệm vụ phù hợp trong tệp tin!`);
      }
    } catch (err: any) {
      setAiError('Lỗi phân tích tệp tin: ' + (err.message || 'Đã xảy ra lỗi'));
    } finally {
      setIsAnalyzingFile(false);
      if (fileUploadInputRef.current) {
        fileUploadInputRef.current.value = '';
      }
    }
  };

  const handleApplySingleExtractedTask = (task: Task) => {
    if (task.title) setTitle(task.title);
    if (task.description) setDescription(task.description);
    if (task.unit) setUnit(task.unit);
    if (task.subtasks && task.subtasks.length > 0) setSubtasks(task.subtasks);
    if (task.createdAt) setCreatedAt(toDatetimeLocal(new Date(task.createdAt)));
    if (task.dueDate) setDueDate(toDatetimeLocal(new Date(task.dueDate)));
    if (task.links && task.links.length > 0) setLinks(task.links);
    setShowExtractedModal(false);
  };

  const handleImportAllExtractedTasks = () => {
    if (extractedTasks.length === 0) return;
    if (onBatchCreateTasks) {
      onBatchCreateTasks(extractedTasks);
    } else {
      extractedTasks.forEach((t) => onSaveTask(t));
    }
    setShowExtractedModal(false);
    onClose();
  };

  // Submit Task Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setAiError('Vui lòng nhập tên nhiệm vụ.');
      return;
    }

    const calculatedP = calculateProgress(subtasks);
    const startIso = safeToIsoString(createdAt);
    const dueIso = safeToIsoString(dueDate, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));

    const taskData: Task = {
      id: initialTask?.id || `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      unit: unit || 'Ban Thanh Niên',
      priority,
      aiAnalysis: aiAnalysis || undefined,
      createdAt: startIso,
      dueDate: dueIso,
      completedAt: calculatedP === 100 ? initialTask?.completedAt || new Date().toISOString() : undefined,
      subtasks,
      progress: calculatedP,
      status:
        calculatedP === 100
          ? 'completed'
          : new Date(dueIso).getTime() < Date.now()
          ? 'overdue'
          : calculatedP > 0
          ? 'in_progress'
          : 'pending',
      attachments,
      links,
      reminder: {
        enabled: reminderEnabled,
        minutesBefore: reminderMinutes,
      },
      assigner: assigner.name.trim() ? assigner : undefined,
    };

    onSaveTask(taskData);
    onClose();
  };

  // Calendar
  const previewGoogleCalUrl = generateGoogleCalendarUrl({
    title: title || 'Nhiệm vụ mới',
    description,
    createdAt: safeToIsoString(createdAt),
    dueDate: safeToIsoString(dueDate, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
    unit,
  });

  const handleDownloadIcs = () => {
    const dummyTask: Task = {
      id: initialTask?.id || 'new-task',
      title: title || 'Nhiệm vụ mới',
      description,
      unit,
      priority,
      createdAt: safeToIsoString(createdAt),
      dueDate: safeToIsoString(dueDate, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
      subtasks,
      progress: liveProgress,
      status: 'pending',
      attachments: [],
      links: [],
      reminder: { enabled: reminderEnabled, minutesBefore: reminderMinutes },
    };
    const icsContent = generateIcsContent(dummyTask);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${(title || 'nhiem_vu').slice(0, 30)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isEditing ? 'Chỉnh Sửa Nhiệm Vụ' : 'Tạo Nhiệm Vụ Mới'}
              </h2>
              <p className="text-xs text-indigo-200">
                AI tham mưu kế hoạch hành động sắc bén cho riêng bạn, ngôn từ gần gũi &amp; tùy chỉnh 100% nội dung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng biểu mẫu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">
          {aiError && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <span>{aiError}</span>
              <button
                type="button"
                onClick={() => setAiError(null)}
                aria-label="Bỏ qua thông báo"
                className="font-bold text-amber-900 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* TẢI LÊN FILE WORD / EXCEL / PDF & TẢI VỀ MẪU EXCEL CHUẨN (12 CỘT) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs sm:text-sm text-emerald-950 block">
                  Tải Lên Tệp Tin Phân Tích Nhiệm Vụ (Word / Excel / PDF)
                </span>
                <p className="text-[11px] text-emerald-800/80">
                  Tải lên tệp để AI phân tích và tự động điền nhiệm vụ, hoặc tải tệp Excel mẫu chuẩn 12 cột.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer hover:border-emerald-400"
                title="Tải về file Excel mẫu gồm đúng 12 cột quy định"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tải về mẫu Excel</span>
              </button>

              <label className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Tải lên tệp (Word/Excel/PDF)</span>
                <input
                  ref={fileUploadInputRef}
                  type="file"
                  accept=".xlsx,.xls,.docx,.doc,.pdf,.txt,.csv"
                  onChange={handleFileUploadAndParse}
                  className="hidden"
                  disabled={isAnalyzingFile}
                />
              </label>
            </div>
          </div>

          {isAnalyzingFile && (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium flex items-center gap-2.5 animate-pulse">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span>Đang đọc nội dung và dùng AI phân tích tạo các nhiệm vụ phù hợp...</span>
            </div>
          )}

          {fileAnalysisNotice && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{fileAnalysisNotice}</span>
            </div>
          )}

          {/* AI Refine Task Suggestion Box */}
          {refinedTaskPreview && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-2 border-indigo-200 space-y-3 animate-in fade-in duration-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-xs">
                  <Wand2 className="w-4 h-4 text-indigo-600" />
                  <span>AI Tham Mưu Sắc Bén (Kế hoạch hành động cá nhân - Ngôn từ gần gũi, dễ hiểu):</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRefinedTaskPreview(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕ Đóng
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-indigo-900">Tên nhiệm vụ đề xuất:</span>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100 font-bold text-slate-900 mt-1">
                    {refinedTaskPreview.refinedTitle}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-indigo-900">Mô tả rõ ràng, thiết thực:</span>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100 text-slate-700 mt-1 leading-relaxed">
                    {refinedTaskPreview.refinedDescription}
                  </div>
                </div>

                {refinedTaskPreview.keySuggestions && refinedTaskPreview.keySuggestions.length > 0 && (
                  <div>
                    <span className="font-bold text-indigo-900">Mẹo thực hiện nhanh:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 mt-1">
                      {refinedTaskPreview.keySuggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRefinedTaskPreview(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={handleApplyRefinedSuggestions}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Áp dụng vào biểu mẫu</span>
                </button>
              </div>
            </div>
          )}

          {/* 1. Tên Nhiệm vụ + Nút AI Tinh chỉnh + Nút Giọng nói */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tên Nhiệm vụ <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <VoiceInputButton
                  currentValue={title}
                  onTranscript={(newText) => setTitle(newText)}
                  mode="replace"
                  tooltip="Nói tên nhiệm vụ để điền nhanh"
                  buttonText="Nói tên việc"
                />
                <button
                  id="ai-refine-task-button"
                  type="button"
                  onClick={handleRefineTaskWithAI}
                  disabled={isRefiningTask || (!title.trim() && !description.trim())}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-all cursor-pointer disabled:opacity-50"
                  title="AI tham mưu tên & mô tả hành động sắc bén cho kế hoạch của bạn"
                >
                  {isRefiningTask ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang tham mưu...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>AI Tham mưu tên &amp; mô tả</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                id="task-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Soạn thảo kế hoạch kiểm tra liên ngành, Chuẩn bị nội dung báo cáo quý 2..."
                className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-medium text-slate-900 placeholder:text-slate-400"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <VoiceInputButton
                  currentValue={title}
                  onTranscript={(newText) => setTitle(newText)}
                  mode="replace"
                  tooltip="Nhấn để nói tên việc"
                />
              </div>
            </div>
          </div>

          {/* 2. Đơn vị & Mức độ ưu tiên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Làm cho đơn vị / Mảng việc:
                </span>
                <span className="text-[10px] font-normal normal-case text-slate-500">(Phân loại tôi làm cho đơn vị này)</span>
              </label>
              {!isAddingNewUnit ? (
                <select
                  value={unit}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsAddingNewUnit(true);
                      setCustomUnitInput('');
                    } else {
                      setUnit(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
                >
                  {userProfile.units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  {!userProfile.units.includes(unit) && <option value={unit}>{unit}</option>}
                  <option value="__add_new__">+ Thêm đơn vị mới...</option>
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customUnitInput}
                    onChange={(e) => setCustomUnitInput(e.target.value)}
                    placeholder="Nhập tên đơn vị tôi làm việc..."
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customUnitInput.trim()) {
                          setUnit(customUnitInput.trim());
                        }
                        setIsAddingNewUnit(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUnitInput.trim()) {
                        setUnit(customUnitInput.trim());
                      }
                      setIsAddingNewUnit(false);
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewUnit(false)}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mức độ ưu tiên
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => {
                  const label = p === 'high' ? 'Cao (Gấp)' : p === 'medium' ? 'Trung bình' : 'Tiêu chuẩn';
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? p === 'high'
                            ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20'
                            : p === 'medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2.5. THÔNG TIN NGƯỜI GIAO VIỆC (HỌ TÊN, NGÀY SINH, ĐƠN VỊ, SĐT, GMAIL) */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/90 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-700" />
                <label className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Người Giao Việc (Cán Bộ Lãnh Đạo / Người Phân Công)
                </label>
              </div>

              {/* Quick Fill From Profile */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {userProfile.defaultAssigner?.name && (
                  <button
                    type="button"
                    onClick={() =>
                      setAssigner(
                        userProfile.defaultAssigner || {
                          name: '',
                          birthDate: '',
                          unit: unit,
                          phone: '',
                          email: '',
                        }
                      )
                    }
                    className="text-[11px] font-bold text-amber-800 bg-white hover:bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                    title="Điền nhanh người giao việc mặc định từ hồ sơ"
                  >
                    ✓ Điền từ hồ sơ: {userProfile.defaultAssigner.name}
                  </button>
                )}

                {userProfile.assignersList && userProfile.assignersList.length > 1 && (
                  <select
                    onChange={(e) => {
                      const selected = userProfile.assignersList?.find(
                        (a) => (a.id || a.name) === e.target.value
                      );
                      if (selected) setAssigner(selected);
                    }}
                    value=""
                    className="text-[11px] font-semibold text-slate-700 bg-white px-2 py-1 rounded-lg border border-amber-300 shadow-2xs cursor-pointer outline-hidden"
                  >
                    <option value="" disabled>
                      Chọn người giao khác...
                    </option>
                    {userProfile.assignersList.map((a) => (
                      <option key={a.id || a.name} value={a.id || a.name}>
                        {a.name} ({a.unit})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Họ và Tên Người Giao Việc:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={assigner.name}
                    onChange={(e) => setAssigner({ ...assigner, name: e.target.value })}
                    placeholder="VD: Nguyễn Văn An"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Đơn Vị Người Giao (Gắn với danh sách đơn vị):
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={assigner.unit || unit}
                    onChange={(e) => setAssigner({ ...assigner, unit: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-hidden"
                  >
                    {userProfile.units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    {Boolean(assigner.unit && !userProfile.units.includes(assigner.unit)) && (
                      <option value={assigner.unit}>{assigner.unit}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <BirthDateInput
                  value={assigner.birthDate || ''}
                  onChange={(d) => setAssigner({ ...assigner, birthDate: d })}
                  label="Ngày Tháng Năm Sinh Người Giao Việc (dd/mm/yyyy)"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Số Điện Thoại (SĐT):
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={assigner.phone || ''}
                    onChange={(e) => setAssigner({ ...assigner, phone: e.target.value })}
                    placeholder="VD: 0912 345 678"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Gmail / Email Liên Hệ:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={assigner.email || ''}
                    onChange={(e) => setAssigner({ ...assigner, email: e.target.value })}
                    placeholder="nguoigiaoviec@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Mô tả cơ bản & Nút Phân rã AI */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mô tả chi tiết / Nội dung nhiệm vụ
              </label>
              <div className="flex items-center gap-1.5">
                <VoiceInputButton
                  currentValue={description}
                  onTranscript={(newText) => setDescription(newText)}
                  mode="append"
                  tooltip="Đọc nội dung để thêm vào mô tả"
                  buttonText="Nói mô tả"
                />
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDesc || !title.trim()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-all cursor-pointer disabled:opacity-50"
                  title="AI viết mô tả hành động cá nhân bằng ngôn từ gần gũi, dễ hiểu"
                >
                  {isGeneratingDesc ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      AI đang viết...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      AI Viết mô tả hành động
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* Formatting Toolbar */}
            <FormattingToolbar
              textareaRef={descriptionTextareaRef}
              value={description}
              onChange={setDescription}
              isPreviewing={isPreviewingDescription}
              onTogglePreview={setIsPreviewingDescription}
              className="mb-1.5"
            />

            {isPreviewingDescription ? (
              <div
                onClick={() => setIsPreviewingDescription(false)}
                className="w-full min-h-[85px] px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/20 text-xs sm:text-sm cursor-text hover:border-indigo-400 transition-colors"
                title="Nhấn để tiếp tục soạn thảo"
              >
                {description ? (
                  <FormattedContentRenderer content={description} />
                ) : (
                  <span className="italic text-slate-400">Chưa có mô tả để xem trước... Nhấn để soạn thảo.</span>
                )}
              </div>
            ) : (
              <textarea
                ref={descriptionTextareaRef}
                id="task-description-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập hoặc để AI viết mô tả công việc (hỗ trợ in đậm, in nghiêng, in màu, danh sách)..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-normal text-slate-800 placeholder:text-slate-400 text-xs sm:text-sm"
              />
            )}
            {description.length > 30 && (
              <div className="flex items-center justify-between text-[11px] text-indigo-700 bg-indigo-50/70 px-3 py-1.5 rounded-lg border border-indigo-100">
                <span>💡 AI có thể phân tích nội dung trên để tự động gợi ý checklist việc bạn cần làm.</span>
                <button
                  type="button"
                  onClick={() => setShowBreakdownOptions(true)}
                  className="font-bold underline hover:text-indigo-900 cursor-pointer"
                >
                  Phân rã checklist ngay →
                </button>
              </div>
            )}
          </div>

          {/* 4. Task nhiệm vụ (Checklist Subtasks) with Full User Editability */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50/90 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Task nhiệm vụ (Checklist hành động của tôi)
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800">
                    Tiến độ: {liveProgress}%
                  </span>
                </div>
              </div>

              {/* AI Auto Create & WBS Buttons - Compact icon only */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowBreakdownOptions(!showBreakdownOptions)}
                  className="p-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-xs transition-all cursor-pointer hover:scale-105"
                  title="AI Tham mưu checklist (WBS)"
                  aria-label="AI Tham mưu checklist (WBS)"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </button>
              </div>
            </div>

            {/* Expandable Breakdown Configuration Panel */}
            {showBreakdownOptions && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Chọn cách AI phân rã các bước hành động cho bạn (ngôn từ dễ hiểu):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBreakdownOptions(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    ✕ Đóng
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setBreakdownMode('phased')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      breakdownMode === 'phased'
                        ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>🏁</span> 3 Giai đoạn
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Chuẩn bị → Thực hiện → Hoàn thành</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBreakdownMode('standard')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      breakdownMode === 'standard'
                        ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>📋</span> Tiêu chuẩn
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">5 - 6 việc con thiết thực, cốt lõi</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBreakdownMode('detailed')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      breakdownMode === 'detailed'
                        ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>🔬</span> Chi tiết từng bước
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">7 - 10 việc con tỉ mỉ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBreakdownMode('deliverables')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      breakdownMode === 'deliverables'
                        ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>📦</span> Sản phẩm đầu ra
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Kết quả và hồ sơ bàn giao</div>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-100 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={breakdownAppend}
                      onChange={(e) => setBreakdownAppend(e.target.checked)}
                      className="rounded-sm text-indigo-600"
                    />
                    <span>Thêm vào danh sách hiện có (không xóa việc cũ)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleBreakdownTask()}
                    disabled={isGeneratingSubtasks || (!title.trim() && !description.trim())}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isGeneratingSubtasks ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        AI đang chia nhỏ...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Tạo checklist việc của tôi
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* AI Research Insight Callout Banner (Editable by user!) */}
            {aiAnalysis && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-blue-50 border border-indigo-200/90 space-y-1.5 animate-in fade-in duration-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>💡 Tham mưu chiến lược từ AI (Dành riêng cho phần việc của bạn):</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAiAnalysis(!isEditingAiAnalysis);
                        setCustomAiAnalysisInput(aiAnalysis || '');
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingAiAnalysis ? 'Đóng sửa' : 'Chỉnh sửa'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiAnalysis(null)}
                      className="text-[11px] text-slate-400 hover:text-slate-700 font-semibold cursor-pointer px-1 py-0.5 rounded-md hover:bg-indigo-100/50"
                      title="Ẩn phân tích"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {isEditingAiAnalysis ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={2}
                      value={customAiAnalysisInput}
                      onChange={(e) => setCustomAiAnalysisInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-indigo-300 bg-white text-xs text-slate-800 focus:outline-hidden"
                      placeholder="Nhập nội dung phân tích / lời khuyên tùy chỉnh của bạn..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingAiAnalysis(false)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAiAnalysisEdit}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Lưu lời khuyên
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                    {aiAnalysis}
                  </p>
                )}
              </div>
            )}

            {/* Breakdown Success Notification */}
            {breakdownSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{breakdownSuccessMsg}</span>
              </div>
            )}

            {/* Progress bar visual */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-300"
                style={{ width: `${liveProgress}%` }}
              />
            </div>

            {/* Subtasks List with Inline Editing for Every Subtask */}
            <div className="space-y-2 mt-2">
              {subtasks.map((subtask, index) => {
                const isCurrentlyEditing = editingSubtaskId === subtask.id;

                if (isCurrentlyEditing) {
                  return (
                    <div
                      key={subtask.id}
                      className="p-3.5 rounded-xl border-2 border-indigo-400 bg-indigo-50/50 space-y-2.5 animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                        <span>Chỉnh sửa việc con #{index + 1}:</span>
                        <span className="text-[10px] text-indigo-700">Tùy biến nội dung do AI tạo</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-700 block">Tên việc con:</label>
                        <input
                          type="text"
                          value={editSubtaskTitle}
                          onChange={(e) => setEditSubtaskTitle(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:border-indigo-600 outline-hidden"
                          placeholder="Tên công việc con..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Giai đoạn:</label>
                          <input
                            type="text"
                            value={editSubtaskPhase}
                            onChange={(e) => setEditSubtaskPhase(e.target.value)}
                            placeholder="VD: Chuẩn bị, Thực hiện, Hoàn thành..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Tên tài liệu tham khảo (nếu có):</label>
                          <input
                            type="text"
                            value={editSubtaskDocTitle}
                            onChange={(e) => setEditSubtaskDocTitle(e.target.value)}
                            placeholder="VD: Mẫu biên bản họp, Tài liệu quy chuẩn..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelEditSubtask}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEditSubtask}
                          disabled={!editSubtaskTitle.trim()}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu việc con</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={subtask.id}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      subtask.completed ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`subtask-check-${subtask.id}`}
                      checked={subtask.completed}
                      onChange={() => handleToggleSubtask(subtask.id)}
                      className="mt-1 w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {subtask.phase && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200/80 shrink-0">
                            {subtask.phase}
                          </span>
                        )}
                        <label
                          htmlFor={`subtask-check-${subtask.id}`}
                          className={`text-xs sm:text-sm font-medium cursor-pointer ${
                            subtask.completed ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {index + 1}. {subtask.title}
                        </label>
                      </div>

                      {/* Linked external resource */}
                      {subtask.resource && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Tài liệu:</span>
                          <a
                            href={subtask.resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80"
                          >
                            <span>{subtask.resource.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Actions: Edit subtask & Delete subtask */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditSubtask(subtask)}
                        title="Chỉnh sửa nội dung việc con này"
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded-md transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(subtask.id)}
                        aria-label={`Xóa hạng mục ${subtask.title}`}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add manual subtask row */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="+ Thêm nhanh một công việc con..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Thêm
              </button>
            </div>
          </div>

          {/* 5. Thời gian bắt đầu & Hạn chót */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Thời gian bắt đầu (Khởi tạo)
              </label>
              <input
                type="datetime-local"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 focus:border-indigo-600 outline-hidden"
              />
              <span className="text-[11px] text-slate-500">Mặc định tính từ lúc tạo nhiệm vụ</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                Thời gian hoàn thành (Hạn chót) <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 focus:border-indigo-600 outline-hidden"
              />
              <div className="flex gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setDueDate(toDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)))}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
                >
                  +1 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(toDatetimeLocal(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)))}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
                >
                  +3 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(toDatetimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
                >
                  +1 Tuần
                </button>
              </div>
            </div>
          </div>

          {/* 6. Tải lên tài liệu, Tải thư mục & Liên kết */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tài liệu & Thư mục đính kèm</span>
                </label>
                <span className="text-[11px] font-bold text-slate-500">
                  {attachments.length} tệp
                </span>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                multiple
                id="task-file-input"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Hidden folder input */}
              <input
                type="file"
                ref={taskFolderInputRef}
                {...({ webkitdirectory: '', directory: '' } as any)}
                multiple
                className="hidden"
                onChange={handleFolderUpload}
              />

              {/* Upload Action Buttons: Tải lên tài liệu (No +), Tải thư mục lên, Tạo thư mục */}
              <div className="grid grid-cols-3 gap-1.5">
                <label
                  htmlFor="task-file-input"
                  className="py-2 px-1.5 border border-slate-200 hover:border-indigo-500 rounded-xl text-center text-xs font-semibold text-slate-700 hover:text-indigo-600 cursor-pointer bg-white transition-all flex items-center justify-center gap-1 shadow-2xs"
                  title="Tải lên tệp tài liệu từ thiết bị"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Tải lên tài liệu</span>
                </label>

                <button
                  type="button"
                  onClick={() => taskFolderInputRef.current?.click()}
                  className="py-2 px-1.5 border border-slate-200 hover:border-indigo-500 rounded-xl text-center text-xs font-semibold text-slate-700 hover:text-indigo-600 cursor-pointer bg-white transition-all flex items-center justify-center gap-1 shadow-2xs"
                  title="Tải lên toàn bộ thư mục từ thiết bị"
                >
                  <FolderUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Tải thư mục lên</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  className="py-2 px-1.5 border border-slate-200 hover:border-indigo-500 rounded-xl text-center text-xs font-semibold text-slate-700 hover:text-indigo-600 cursor-pointer bg-white transition-all flex items-center justify-center gap-1 shadow-2xs"
                  title="Tạo nhóm thư mục đính kèm"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Tạo thư mục</span>
                </button>
              </div>

              {/* Create folder inline form */}
              {isCreatingFolder && (
                <div className="flex items-center gap-1.5 p-2 bg-indigo-50/90 rounded-xl border border-indigo-200 animate-in fade-in">
                  <Folder className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <input
                    type="text"
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    placeholder="Nhập tên thư mục mới..."
                    className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newFolderNameInput.trim()) {
                        setSelectedAttachmentFolder(newFolderNameInput.trim());
                        setIsCreatingFolder(false);
                      }
                    }}
                    className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Tạo
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        {att.name.includes('/') ? (
                          <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        <span className="truncate font-medium text-slate-700" title={att.name}>
                          {att.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400">
                          {Math.round(att.size / 1024)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          aria-label={`Xóa tệp ${att.name}`}
                          className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Liên kết ngoài</span>
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Tiêu đề link (Google Drive, Tài liệu...)"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-hidden"
                />
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Thêm liên kết
                  </button>
                </div>
              </div>

              {links.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200"
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate max-w-[180px] font-medium text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        {link.title}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(link.id)}
                        aria-label={`Xóa liên kết ${link.title}`}
                        className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 7. Thêm vào Google Lịch + Nhắc hẹn */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Thêm vào Google Lịch &amp; Nhắc hẹn
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="rounded-sm text-indigo-600"
                />
                Bật nhắc thông báo
              </label>
            </div>

            {reminderEnabled && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-600">Thời gian nhắc trước hạn:</span>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-white font-medium text-slate-800 outline-hidden"
                >
                  <option value={15}>15 phút trước</option>
                  <option value={30}>30 phút trước</option>
                  <option value={60}>1 giờ trước</option>
                  <option value={1440}>1 ngày trước</option>
                </select>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={previewGoogleCalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-2xs transition-all"
              >
                <CalendarCheck2 className="w-3.5 h-3.5" />
                Thêm ngay vào Google Calendar
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Tải file lịch (.ics)
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer hover:scale-[1.02]"
            >
              {isEditing ? 'Lưu thay đổi' : 'Tạo Nhiệm vụ'}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL XEM TRƯỚC VÀ CHỌN CÁC NHIỆM VỤ ĐÃ PHÂN TÍCH TỪ TỆP TIN */}
      {showExtractedModal && extractedTasks.length > 0 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-base font-bold">
                    Đã Trích Xuất {extractedTasks.length} Nhiệm Vụ Từ Tệp Tin
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Bạn có thể chọn 1 nhiệm vụ để điền vào biểu mẫu hoặc nhập toàn bộ vào hệ thống
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExtractedModal(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {extractedTasks.map((task, idx) => (
                <div
                  key={task.id || idx}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">{idx + 1}. {task.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {task.unit}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-slate-600 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Checklist: <strong>{task.subtasks?.length || 0} việc con</strong></span>
                      <span>Hạn: <strong>{new Date(task.dueDate).toLocaleDateString('vi-VN')}</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplySingleExtractedTask(task)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-800 font-bold transition-all shrink-0 cursor-pointer text-xs"
                  >
                    Áp dụng vào form này
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowExtractedModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleImportAllExtractedTasks}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Nhập tất cả {extractedTasks.length} nhiệm vụ vào hệ thống</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
