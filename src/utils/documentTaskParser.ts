import { ParsedTaskItem, parseExcelTasks } from './excelTemplate';
import { Subtask, TaskLink } from '../types/task';

/**
 * Extracts raw text from a text or markdown file
 */
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc file văn bản.'));
    reader.readAsText(file);
  });
}

/**
 * Extracts plain text from DOCX (Office Open XML) file by scanning XML streams
 */
async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(arrayBuffer);

    // Regex match XML text blocks <w:t>...</w:t>
    const matches = content.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (matches && matches.length > 0) {
      const texts = matches
        .map((m) => m.replace(/<[^>]+>/g, '').trim())
        .filter((t) => t.length > 0);
      return texts.join(' ');
    }
    // Fallback: extract any visible words
    return content.replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}\s.,:;!?\-_]/gu, ' ').slice(0, 5000);
  } catch {
    return `Nội dung trích xuất từ file: ${file.name}`;
  }
}

/**
 * Rule-based heuristic task extractor from raw document text
 */
function extractTasksFromRawText(text: string, fileName: string): ParsedTaskItem[] {
  const lines = text
    .split(/\r?\n|;|\.\s+(?=[A-ZĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰ])/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10 && l.length < 250);

  const taskKeywords = [
    'nhiệm vụ',
    'kế hoạch',
    'triển khai',
    'thực hiện',
    'soạn thảo',
    'tổ chức',
    'báo cáo',
    'rà soát',
    'kiểm tra',
    'xây dựng',
    'hội nghị',
    'chương trình',
    'nghiên cứu',
    'đôn đốc',
    'tham mưu',
    'phối hợp',
  ];

  const matchedLines = lines.filter((line) => {
    const lower = line.toLowerCase();
    return taskKeywords.some((k) => lower.includes(k));
  });

  const selectedLines = matchedLines.length > 0 ? matchedLines.slice(0, 8) : lines.slice(0, 4);

  if (selectedLines.length === 0) {
    selectedLines.push(`Thực hiện các nội dung theo văn bản: ${fileName}`);
  }

  return selectedLines.map((line, idx) => {
    const cleanTitle = line.replace(/^[\d+.\-–*•]\s*/, '').trim();
    const subtasks: Subtask[] = [
      {
        id: `sub-${Date.now()}-${idx}-1`,
        title: `Tôi nghiên cứu văn bản "${fileName}" và chuẩn bị hồ sơ triển khai`,
        phase: 'Chuẩn bị',
        completed: false,
      },
      {
        id: `sub-${Date.now()}-${idx}-2`,
        title: `Tôi trực tiếp thực hiện nội dung "${cleanTitle.slice(0, 60)}"`,
        phase: 'Thực hiện',
        completed: false,
      },
      {
        id: `sub-${Date.now()}-${idx}-3`,
        title: `Tôi kiểm tra kết quả và tổng hợp báo cáo hoàn thành`,
        phase: 'Hoàn thành',
        completed: false,
      },
    ];

    const defaultDueDate = new Date(Date.now() + (idx + 3) * 24 * 60 * 60 * 1000);

    return {
      id: `doc-task-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      title: cleanTitle.length > 80 ? `${cleanTitle.slice(0, 77)}...` : cleanTitle,
      description: `Nhiệm vụ được trích xuất tự động từ văn bản "${fileName}". Yêu cầu thực hiện đúng tiến độ và tiêu chuẩn chất lượng.`,
      subtasks,
      createdAt: new Date().toISOString(),
      dueDate: defaultDueDate.toISOString(),
      links: [],
      addToGoogleCalendar: true,
      priority: idx === 0 ? 'high' : 'medium',
    };
  });
}

/**
 * Main parser entry: parses Word, Excel, PDF, or text files into structured tasks
 */
export async function parseDocumentTasks(file: File): Promise<ParsedTaskItem[]> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Excel / CSV files
  if (['xlsx', 'xls', 'csv'].includes(extension)) {
    return parseExcelTasks(file);
  }

  // 2. Word / PDF / Text files
  let rawText = '';
  if (extension === 'docx') {
    rawText = await extractTextFromDocx(file);
  } else if (['txt', 'md', 'json'].includes(extension)) {
    rawText = await readTextFile(file);
  } else {
    // PDF or other binary text approximation
    try {
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      rawText = decoder.decode(buffer).slice(0, 10000);
    } catch {
      rawText = file.name;
    }
  }

  // Try AI endpoint on server
  try {
    const res = await fetch('/api/ai/extract-tasks-from-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: extension,
        fileText: rawText.slice(0, 6000),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        return data.tasks.map((t: any, idx: number) => ({
          id: `ai-extracted-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          title: t.title || `Nhiệm vụ từ ${file.name}`,
          description: t.description || '',
          subtasks: Array.isArray(t.subtasks)
            ? t.subtasks.map((st: any, sIdx: number) => ({
                id: `st-${Date.now()}-${idx}-${sIdx}`,
                title: typeof st === 'string' ? st : st.title || 'Bước thực hiện',
                phase: st.phase || (sIdx === 0 ? 'Chuẩn bị' : 'Thực hiện'),
                completed: false,
              }))
            : [],
          createdAt: t.startDate || new Date().toISOString(),
          dueDate: t.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          links: Array.isArray(t.links) ? t.links : [],
          addToGoogleCalendar: !!t.addToGoogleCalendar,
          priority: t.priority || 'medium',
        }));
      }
    }
  } catch {
    // Fall back to local rule-based extractor
  }

  return extractTasksFromRawText(rawText, file.name);
}
