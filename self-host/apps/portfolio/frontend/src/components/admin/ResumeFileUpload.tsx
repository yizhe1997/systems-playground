'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Trash2, UploadCloud, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ResumeFile = { name: string; filename: string; path: string; size: number; modified: string };

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

// Filebrowser is a separate, optional service - reachable, misconfigured, or
// entirely absent are all real states this widget needs to render cleanly
// rather than silently failing or leaving the admin looking at a blank list.
export default function ResumeFileUpload({
  isAdmin,
  activePath,
  onActivePathChange,
}: {
  isAdmin: boolean;
  activePath: string;
  onActivePathChange: (path: string) => void;
}) {
  const [files, setFiles] = useState<ResumeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadFiles = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/resume-files', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error || 'Failed to load resume files.');
        setFiles([]);
        return;
      }
      setFiles(body || []);
    } catch {
      setError('Network error while loading resume files.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const uploadFiles = async (fileList: FileList | File[]) => {
    if (!isAdmin) return;
    const list = Array.from(fileList);
    if (list.length === 0) return;

    setUploading(true);
    let lastUploadedPath: string | null = null;
    let failures = 0;

    for (const file of list) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/proxy/resume-files', { method: 'POST', body: formData });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          failures += 1;
          toast({ title: 'Upload failed', description: body?.error || `Couldn't upload "${file.name}".`, variant: 'destructive' });
          continue;
        }
        lastUploadedPath = body?.path || lastUploadedPath;
      } catch {
        failures += 1;
        toast({ title: 'Upload failed', description: `Network error uploading "${file.name}".`, variant: 'destructive' });
      }
    }

    setUploading(false);
    if (failures < list.length) {
      toast({ title: 'Success', description: `Uploaded ${list.length - failures} of ${list.length} file(s).` });
    }
    // First-ever upload with nothing selected yet - default to it rather
    // than leaving "active resume" dangling with no valid selection.
    if (!activePath && lastUploadedPath) {
      onActivePathChange(lastUploadedPath);
    }
    await loadFiles();
  };

  const handleDelete = async (file: ResumeFile) => {
    if (!isAdmin) return;
    setDeletingPath(file.path);
    try {
      const res = await fetch(`/api/proxy/resume-files?filename=${encodeURIComponent(file.filename)}`, { method: 'DELETE' });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast({ title: 'Error', description: body?.error || `Couldn't delete "${file.name}".`, variant: 'destructive' });
        return;
      }
      if (activePath === file.path) {
        onActivePathChange('');
      }
      setFiles((prev) => prev.filter((f) => f.path !== file.path));
    } catch {
      toast({ title: 'Error', description: 'Network error while deleting the file.', variant: 'destructive' });
    } finally {
      setDeletingPath(null);
    }
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor="resume-file-input"
        onDragOver={(e) => { e.preventDefault(); if (isAdmin) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (isAdmin && e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed p-8 text-center transition-colors ${
          isAdmin ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
        } ${dragOver ? 'border-black bg-[var(--ds-yellow)]/30' : 'border-black/30'}`}
        style={{ borderRadius: '0.75rem' }}
      >
        <UploadCloud className="w-6 h-6" aria-hidden="true" />
        <p className="text-sm font-bold">{uploading ? 'Uploading…' : 'Click to upload, or drag files here'}</p>
        <p className="text-xs text-[var(--ds-charcoal)]/60">PDF, DOC, or DOCX. You can upload more than one.</p>
        <input
          ref={fileInputRef}
          id="resume-file-input"
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          disabled={!isAdmin || uploading}
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = '';
          }}
          className="sr-only"
        />
      </label>

      {loading ? (
        <p className="text-sm text-[var(--ds-charcoal)]/60">Loading files…</p>
      ) : error ? (
        <div
          role="alert"
          className="flex items-start gap-2 border-2 border-black bg-[var(--ds-yellow)] p-4"
          style={{ borderRadius: '0.75rem' }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-bold">{error}</p>
            <button
              type="button"
              onClick={loadFiles}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold underline hover:no-underline"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      ) : files.length === 0 ? (
        <p className="text-sm text-[var(--ds-charcoal)]/60">No resume files uploaded yet.</p>
      ) : (
        <ul className="divide-y-2 divide-black border-2 border-black" style={{ borderRadius: '0.75rem', overflow: 'hidden' }}>
          {files.map((file) => {
            const isActive = activePath === file.path;
            return (
              <li key={file.path} className="flex items-center gap-3 p-3">
                <FileText className="w-4 h-4 shrink-0 text-[var(--ds-charcoal)]/60" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{file.name}</p>
                  <p className="text-xs text-[var(--ds-charcoal)]/60">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onActivePathChange(file.path)}
                  disabled={!isAdmin}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-2 border-black shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive ? 'bg-black text-white' : 'bg-white hover:bg-[var(--ds-yellow)]'
                  }`}
                  style={{ borderRadius: '0.5rem' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {isActive ? 'Active' : 'Set active'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(file)}
                  disabled={!isAdmin || deletingPath === file.path}
                  aria-label={`Delete ${file.name}`}
                  className="shrink-0 p-1.5 border-2 border-transparent hover:border-black text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: '0.5rem' }}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
