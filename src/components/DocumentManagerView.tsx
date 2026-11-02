import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  FolderUp,
  FileText,
  FileSpreadsheet,
  File,
  Presentation,
  Link2,
  Upload,
  Plus,
  Search,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Layers,
  HardDrive,
  FileCheck,
  AlertCircle,
  X,
  Filter,
} from 'lucide-react';
import { AppDocument, AppExternalLink, Task, UserProfile } from '../types/task';

interface DocumentManagerViewProps {
  tasks: Task[];
  userProfile: UserProfile;
  currentUserId?: string;
  onOpenTaskModal?: (task: Task) => void;
}

export const DocumentManagerView: React.FC<DocumentManagerViewProps> = ({
  tasks,
  userProfile,
  currentUserId = 'default',
  onOpenTaskModal,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'links'>('documents');
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [links, setLinks] = useState<AppExternalLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('all');

  // Folder states
  const [folders, setFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('taskmaster_doc_folders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Hồ sơ chung', 'Báo cáo & Tờ trình', 'Kế hoạch công tác', 'Tài liệu hướng dẫn'];
  });
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [uploadFolder, setUploadFolder] = useState<string>('Hồ sơ chung');

  // Create folder modal state
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Folder upload ref & progress
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFolder, setIsUploadingFolder] = useState(false);
  const [folderUploadProgress, setFolderUploadProgress] = useState<string | null>(null);

  // Upload Document Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTaskId, setUploadTaskId] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Add Link Modal
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkNotes, setLinkNotes] = useState('');
  const [linkTaskId, setLinkTaskId] = useState<string>('');
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Copy notification
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<AppDocument | null>(null);
  const [deleteConfirmLink, setDeleteConfirmLink] = useState<AppExternalLink | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents and links
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [docRes, linkRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/links'),
      ]);

      if (docRes.ok) {
        const docData = await docRes.json();
        setDocuments(docData.documents || []);
      }
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        setLinks(linkData.links || []);
      }
    } catch (e) {
      console.warn('Lỗi tải dữ liệu tài liệu/liên kết:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadFile(f);
    if (!uploadTitle.trim()) {
      setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Vui lòng chọn tệp tin cần tải lên.');
      return;
    }

    const maxSize = 15 * 1024 * 1024; // 15MB
    if (uploadFile.size > maxSize) {
      setUploadError('Kích thước tệp vượt quá giới hạn 15MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1] || res;
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadFile);
      const base64Data = await base64Promise;

      const linkedTask = tasks.find((t) => t.id === uploadTaskId);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadTitle.trim() || uploadFile.name,
          filename: uploadFile.name,
          base64Data,
          mimeType: uploadFile.type,
          ownerId: currentUserId,
          ownerName: userProfile.displayName || 'Cán bộ',
          taskId: uploadTaskId || null,
          taskTitle: linkedTask ? linkedTask.title : null,
          description: uploadDescription.trim(),
          folder: uploadFolder || 'Hồ sơ chung',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi tải tệp tin lên máy chủ.');
      }

      const data = await res.json();
      if (data.document) {
        setDocuments((prev) => [data.document, ...prev]);
      }

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadTaskId('');
      setUploadDescription('');
    } catch (err: any) {
      setUploadError(err.message || 'Lỗi tải lên tài liệu.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    if (!folders.includes(trimmed)) {
      const next = [...folders, trimmed];
      setFolders(next);
      localStorage.setItem('taskmaster_doc_folders', JSON.stringify(next));
      setSelectedFolder(trimmed);
      setUploadFolder(trimmed);
    }
    setNewFolderName('');
    setIsCreateFolderModalOpen(false);
  };

  const handleFolderUploadSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFolder(true);
    setFolderUploadProgress(`Đang chuẩn bị tải thư mục (${files.length} tệp)...`);

    // Extract folder name from first file's webkitRelativePath
    let detectedFolder = 'Thư mục mới';
    const firstPath = (files[0] as any)?.webkitRelativePath;
    if (firstPath) {
      const parts = firstPath.split('/');
      if (parts.length > 1) {
        detectedFolder = parts[0];
      }
    }

    if (!folders.includes(detectedFolder)) {
      const nextFolders = [...folders, detectedFolder];
      setFolders(nextFolders);
      localStorage.setItem('taskmaster_doc_folders', JSON.stringify(nextFolders));
    }

    let successCount = 0;
    const fileList = Array.from(files);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.startsWith('.') || file.size === 0) continue; // Skip hidden/empty

      try {
        setFolderUploadProgress(`Đang tải (${i + 1}/${fileList.length}): ${file.name}`);
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            const base64 = res.split(',')[1] || res;
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64Data = await base64Promise;

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name.replace(/\.[^/.]+$/, ''),
            filename: file.name,
            base64Data,
            mimeType: file.type,
            ownerId: currentUserId,
            ownerName: userProfile.displayName || 'Cán bộ',
            taskId: null,
            taskTitle: null,
            description: `Tải lên từ thư mục "${detectedFolder}"`,
            folder: detectedFolder,
          }),
        });

        if (res.ok) {
          successCount++;
        }
      } catch (err) {
        console.warn('Lỗi tải tệp:', file.name, err);
      }
    }

    setIsUploadingFolder(false);
    setFolderUploadProgress(null);
    setSelectedFolder(detectedFolder);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
    await fetchAllData();
  };

  const handleAddLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) {
      setLinkError('Vui lòng nhập tiêu đề và đường link URL.');
      return;
    }

    setIsSavingLink(true);
    setLinkError(null);

    try {
      const linkedTask = tasks.find((t) => t.id === linkTaskId);

      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: linkTitle.trim(),
          url: linkUrl.trim(),
          notes: linkNotes.trim(),
          taskId: linkTaskId || null,
          taskTitle: linkedTask ? linkedTask.title : null,
          ownerId: currentUserId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi lưu liên kết.');
      }

      const data = await res.json();
      if (data.link) {
        setLinks((prev) => [data.link, ...prev]);
      }

      setIsAddLinkModalOpen(false);
      setLinkTitle('');
      setLinkUrl('');
      setLinkNotes('');
      setLinkTaskId('');
    } catch (err: any) {
      setLinkError(err.message || 'Lỗi lưu liên kết.');
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (e) {
      console.warn('Lỗi xóa tài liệu:', e);
    } finally {
      setDeleteConfirmDoc(null);
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      const res = await fetch(`/api/links/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (e) {
      console.warn('Lỗi xóa liên kết:', e);
    } finally {
      setDeleteConfirmLink(null);
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2500);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFormatBadge = (fmt: string) => {
    switch (fmt) {
      case 'pdf':
        return {
          icon: <File className="w-5 h-5 text-rose-600" />,
          label: 'PDF',
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
        };
      case 'word':
        return {
          icon: <FileText className="w-5 h-5 text-blue-600" />,
          label: 'Word',
          bg: 'bg-blue-50 border-blue-200 text-blue-700',
        };
      case 'excel':
        return {
          icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
          label: 'Excel',
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        };
      case 'powerpoint':
        return {
          icon: <Presentation className="w-5 h-5 text-amber-600" />,
          label: 'PowerPoint',
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
        };
      default:
        return {
          icon: <FileCheck className="w-5 h-5 text-slate-600" />,
          label: 'Tệp tin',
          bg: 'bg-slate-50 border-slate-200 text-slate-700',
        };
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    if (selectedFolder !== 'all') {
      const docFolder = doc.folder || 'Hồ sơ chung';
      if (docFolder !== selectedFolder) return false;
    }
    if (selectedFormat !== 'all' && doc.format !== selectedFormat) return false;
    if (selectedTaskId !== 'all') {
      if (selectedTaskId === 'general' && doc.taskId) return false;
      if (selectedTaskId !== 'general' && doc.taskId !== selectedTaskId) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.originalName.toLowerCase().includes(q) ||
        (doc.description || '').toLowerCase().includes(q) ||
        (doc.taskTitle || '').toLowerCase().includes(q) ||
        (doc.folder || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter links
  const filteredLinks = links.filter((link) => {
    if (selectedTaskId !== 'all') {
      if (selectedTaskId === 'general' && link.taskId) return false;
      if (selectedTaskId !== 'general' && link.taskId !== selectedTaskId) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        link.title.toLowerCase().includes(q) ||
        link.url.toLowerCase().includes(q) ||
        (link.notes || '').toLowerCase().includes(q) ||
        (link.taskTitle || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalBytes = documents.reduce((acc, d) => acc + (d.size || 0), 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Hidden input for folder upload */}
      <input
        type="file"
        ref={folderInputRef}
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={handleFolderUploadSelect}
      />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 md:p-7 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
              Kho Lưu Trữ Số
            </span>
            <span className="text-xs text-blue-200/80">Lưu trữ máy chủ bền vững & Liên kết ngoài</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Kho Tài Liệu &amp; Liên Kết Công Vụ
          </h1>
          {folderUploadProgress && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 text-xs font-medium animate-pulse">
              <FolderUp className="w-4 h-4" />
              <span>{folderUploadProgress}</span>
            </div>
          )}
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {/* 1. Tải lên tài liệu (Xóa dấu +) */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Tải lên tài liệu</span>
          </button>

          {/* 2. Tải thư mục lên (Chức năng mới) */}
          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploadingFolder}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Tải lên toàn bộ thư mục từ máy tính"
          >
            <FolderUp className="w-4 h-4" />
            <span>{isUploadingFolder ? 'Đang tải...' : 'Tải thư mục lên'}</span>
          </button>

          {/* 3. Tạo thư mục (Chức năng mới) */}
          <button
            onClick={() => setIsCreateFolderModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Tạo thư mục mới trong mục tài liệu đính kèm"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Tạo thư mục</span>
          </button>

          {/* 4. Thêm liên kết (Xóa dấu +) */}
          <button
            onClick={() => setIsAddLinkModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Link2 className="w-4 h-4" />
            <span>Thêm liên kết</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Tài Liệu</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{documents.length}</div>
            <div className="text-[11px] text-slate-500">PDF, Word, Excel, PPT</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Liên Kết Ngoài</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{links.length}</div>
            <div className="text-[11px] text-slate-500">Đã kiểm tra an toàn</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gắn Với Nhiệm Vụ</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {documents.filter((d) => Boolean(d.taskId)).length + links.filter((l) => Boolean(l.taskId)).length}
            </div>
            <div className="text-[11px] text-slate-500">Hồ sơ theo luồng việc</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dung Lượng Đã Dùng</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{formatFileSize(totalBytes)}</div>
            <div className="text-[11px] text-slate-500">Lưu trữ máy chủ bền vững</div>
          </div>
        </div>
      </div>

      {/* Main Tabs and Filter Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Main tabs: Documents vs Links */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl">
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Tài Liệu Đính Kèm ({documents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'links'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Liên Kết Ngoài ({links.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, ghi chú, nhiệm vụ..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Lọc theo:</span>
            </span>

            {/* Task filter dropdown */}
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-hidden"
            >
              <option value="all">Tất cả phạm vi (Chung &amp; Nhiệm vụ)</option>
              <option value="general">Chỉ kho lưu trữ chung</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  Nhiệm vụ: {t.title.length > 35 ? `${t.title.slice(0, 32)}...` : t.title}
                </option>
              ))}
            </select>

            {/* Format filter pills for documents */}
            {activeTab === 'documents' && (
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'all', label: 'Tất cả định dạng' },
                  { id: 'pdf', label: 'PDF' },
                  { id: 'word', label: 'Word' },
                  { id: 'excel', label: 'Excel' },
                  { id: 'powerpoint', label: 'PowerPoint' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      selectedFormat === fmt.id
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            Hiển thị {activeTab === 'documents' ? filteredDocuments.length : filteredLinks.length} mục
          </div>
        </div>

        {/* Folder filter tabs for documents */}
        {activeTab === 'documents' && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-slate-500 font-semibold text-xs flex items-center gap-1.5 mr-1">
              <Folder className="w-3.5 h-3.5 text-blue-600" />
              <span>Thư mục:</span>
            </span>
            <button
              onClick={() => setSelectedFolder('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFolder === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Tất cả</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedFolder === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {documents.length}
              </span>
            </button>
            {folders.map((folderName) => {
              const count = documents.filter((d) => (d.folder || 'Hồ sơ chung') === folderName).length;
              return (
                <button
                  key={folderName}
                  onClick={() => setSelectedFolder(folderName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedFolder === folderName
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Folder className={`w-3.5 h-3.5 ${selectedFolder === folderName ? 'text-white' : 'text-blue-500'}`} />
                  <span>{folderName}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedFolder === folderName ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIsCreateFolderModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200/80 transition-all cursor-pointer flex items-center gap-1"
              title="Tạo thêm thư mục mới"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Tạo thư mục</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Section: Documents Grid / Links Grid */}
      {activeTab === 'documents' ? (
        filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Folder className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">Chưa có tài liệu nào phù hợp</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tải lên tài liệu PDF, Word (.docx), Excel (.xlsx) hoặc PowerPoint (.pptx) để lưu trữ bền vững và gắn kết vào từng nhiệm vụ.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Tải lên tài liệu ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => {
              const badge = getFormatBadge(doc.format);

              return (
                <div
                  key={doc.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform">
                          {badge.icon}
                        </div>
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-2">
                            {formatFileSize(doc.size)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setDeleteConfirmDoc(doc)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                          <Folder className="w-3 h-3 text-indigo-500" />
                          {doc.folder || 'Hồ sơ chung'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {doc.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5" title={doc.originalName}>
                        Tên gốc: {doc.originalName}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5 truncate">
                        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {doc.taskTitle ? (
                            <strong className="text-blue-700">Nhiệm vụ: {doc.taskTitle}</strong>
                          ) : (
                            <span className="text-slate-400">Kho tài liệu chung</span>
                          )}
                        </span>
                      </div>
                      <span className="shrink-0 text-slate-400">
                        {new Date(doc.uploadDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Xem</span>
                      </a>
                      <a
                        href={doc.url}
                        download={doc.originalName}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-2xs flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải về</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : filteredLinks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Link2 className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Chưa có liên kết ngoài nào</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Lưu nhanh các đường link tài liệu Google Drive, cổng dịch vụ công, thông báo văn bản hoặc tài nguyên liên quan.
          </p>
          <button
            onClick={() => setIsAddLinkModalOpen(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            + Thêm liên kết đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.map((link) => (
            <div
              key={link.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(link.url, link.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Sao chép đường link"
                    >
                      {copiedLinkId === link.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmLink(link)}
                      className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Xóa liên kết"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                    {link.title}
                  </h4>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline truncate block mt-0.5"
                    title={link.url}
                  >
                    {link.url}
                  </a>
                  {link.notes && (
                    <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                      {link.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate max-w-[170px]">
                  {link.taskTitle ? (
                    <strong className="text-emerald-700">Nhiệm vụ: {link.taskTitle}</strong>
                  ) : (
                    <span className="text-slate-400">Liên kết chung</span>
                  )}
                </span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors flex items-center gap-1 shrink-0"
                >
                  <span>Mở link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Document Confirmation Modal */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Xác nhận xóa tài liệu?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa tệp tin <strong>&quot;{deleteConfirmDoc.name}&quot;</strong>? Thao tác này sẽ xóa tệp vĩnh viễn khỏi máy chủ và không thể khôi phục.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleDeleteDocument(deleteConfirmDoc.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Link Confirmation Modal */}
      {deleteConfirmLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Xác nhận xóa liên kết?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc muốn xóa liên kết <strong>&quot;{deleteConfirmLink.title}&quot;</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmLink(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleDeleteLink(deleteConfirmLink.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Xóa liên kết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-slate-900">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>Tải Lên Tài Liệu Mới</span>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* File selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn tệp tin (PDF, Word, Excel, PowerPoint): *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 hover:bg-blue-50/60 transition-all text-center cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="text-xs font-semibold text-slate-700">
                    {uploadFile ? uploadFile.name : 'Bấm để chọn tệp từ máy tính'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {uploadFile ? `${formatFileSize(uploadFile.size)}` : 'Hỗ trợ tối đa 15MB'}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên hiển thị tài liệu: *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch phối hợp quý 4..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              {/* Folder Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Thư mục lưu trữ: *</span>
                  <button
                    type="button"
                    onClick={() => setIsCreateFolderModalOpen(true)}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>+ Thư mục mới</span>
                  </button>
                </label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white"
                >
                  {folders.map((f) => (
                    <option key={f} value={f}>
                      📁 {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Task Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gắn kết với nhiệm vụ (Tùy chọn):
                </label>
                <select
                  value={uploadTaskId}
                  onChange={(e) => setUploadTaskId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white"
                >
                  <option value="">-- Kho tài liệu dùng chung (Không gắn task) --</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả / Ghi chú nội dung:
                </label>
                <textarea
                  rows={2}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Tóm tắt nội dung chính hoặc lưu ý khi sử dụng văn bản..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploading ? 'Đang tải lên...' : 'Tải lên ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-slate-900">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                <span>Tạo Thư Mục Mới</span>
              </div>
              <button
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên thư mục tài liệu: *
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch năm 2026, Quyết định bổ nhiệm..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Tạo thư mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add External Link Modal */}
      {isAddLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-slate-900">
                <Link2 className="w-5 h-5 text-emerald-600" />
                <span>Thêm Đường Liên Kết Ngoài</span>
              </div>
              <button
                onClick={() => setIsAddLinkModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLinkSubmit} className="space-y-4">
              {linkError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{linkError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên liên kết: *
                </label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Ví dụ: Google Drive - Thư mục ảnh hội thao..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ URL: *
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc trang web"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              {/* Linked Task Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gắn kết với nhiệm vụ (Tùy chọn):
                </label>
                <select
                  value={linkTaskId}
                  onChange={(e) => setLinkTaskId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 bg-white"
                >
                  <option value="">-- Liên kết dùng chung (Không gắn task) --</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú tùy chọn:
                </label>
                <textarea
                  rows={2}
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  placeholder="Mật khẩu truy cập, người liên hệ hoặc hướng dẫn..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingLink}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingLink ? 'Đang lưu...' : 'Lưu liên kết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
