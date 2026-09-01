import { useRef, useState, useCallback, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { C } from '../../styles/theme';

export interface UploadFile {
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
}

interface Props {
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  label?: string;
  hint?: string;
  icon?: string;
  value?: UploadFile[];
  onChange: (files: UploadFile[]) => void;
  onUpload?: (files: File[], onProgress: (pct: number) => void) => Promise<{ url: string; type: string }[]>;
  tall?: boolean;
  cta?: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FilePreview({ uf, onRemove }: { uf: UploadFile; onRemove: () => void }) {
  const isVideo = uf.file.type.startsWith('video/');
  return (
    <div style={{ position: 'relative', borderRadius: 9, overflow: 'hidden', border: `1.5px solid ${uf.status === 'error' ? C.red : uf.status === 'done' ? C.green : C.border}`, background: C.surface2 }}>
      {isVideo ? (
        <video src={uf.preview} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} muted playsInline />
      ) : (
        <img src={uf.preview} alt={uf.file.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
      )}

      {/* Progress overlay */}
      {uf.status === 'uploading' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,7,15,.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#fff', fontFamily: "'DM Mono',monospace" }}>{uf.progress}%</div>
          <div style={{ width: '70%', background: C.border, borderRadius: 3, height: 3 }}>
            <div style={{ height: 3, borderRadius: 3, background: C.grad, width: `${uf.progress}%`, transition: 'width .2s ease' }} />
          </div>
        </div>
      )}

      {uf.status === 'done' && (
        <div style={{ position: 'absolute', top: 5, left: 5, background: C.green, borderRadius: 4, padding: '1px 6px', fontSize: 9, color: '#fff', fontWeight: 700 }}>✓ OK</div>
      )}
      {uf.status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,77,106,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 10, color: C.red, fontFamily: "'DM Mono',monospace", padding: '3px 8px', background: 'rgba(0,0,0,.6)', borderRadius: 5 }}>Error</div>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.7)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
      >✕</button>

      {/* File info */}
      <div style={{ padding: '6px 8px', background: C.surface }}>
        <div style={{ fontSize: 10, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uf.file.name}</div>
        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: "'DM Mono',monospace" }}>{formatSize(uf.file.size)}</div>
      </div>
    </div>
  );
}

export default function FileUploadZone({
  accept = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm',
  multiple = false,
  maxSizeMB = 500,
  label = 'Arrastrá o hacé click para subir',
  hint = 'MP4, MOV, JPG, PNG · máx 500 MB',
  icon = '🎬',
  value = [],
  onChange,
  onUpload,
  tall = false,
  cta,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Keep a ref to the latest files to avoid stale closures during async uploads
  const latestRef = useRef<UploadFile[]>(value);
  useEffect(() => { latestRef.current = value; }, [value]);

  const patchFile = useCallback((idx: number, patch: Partial<UploadFile>) => {
    const copy = [...latestRef.current];
    copy[idx] = { ...copy[idx], ...patch };
    latestRef.current = copy;
    onChange(copy);
  }, [onChange]);

  const processFiles = useCallback(async (rawFiles: FileList | File[]) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    const valid = Array.from(rawFiles).filter(f => {
      if (f.size > maxBytes) return false;
      const types = accept.split(',').map(t => t.trim());
      return types.some(t => t === f.type || (t.endsWith('/*') && f.type.startsWith(t.slice(0, -2))));
    });
    if (!valid.length) return;

    const newEntries: UploadFile[] = valid.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      progress: 0,
      status: 'pending',
    }));

    const baseLen = multiple ? latestRef.current.length : 0;
    const next = multiple ? [...latestRef.current, ...newEntries] : newEntries;
    latestRef.current = next;
    onChange(next);

    if (!onUpload) return;

    for (let i = 0; i < newEntries.length; i++) {
      const idx = baseLen + i;
      patchFile(idx, { status: 'uploading' });

      try {
        const results = await onUpload([newEntries[i].file], pct => patchFile(idx, { progress: pct }));
        patchFile(idx, { status: 'done', url: results[0]?.url, progress: 100 });
      } catch {
        patchFile(idx, { status: 'error', error: 'Error al subir' });
      }
    }
  }, [onChange, onUpload, accept, maxSizeMB, multiple, patchFile]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    const copy = [...value];
    URL.revokeObjectURL(copy[idx].preview);
    copy.splice(idx, 1);
    onChange(copy);
  };

  const hasFiles = value.length > 0;

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `1.5px dashed ${dragging ? C.accent : hasFiles ? C.green + '66' : C.borderBright}`,
          borderRadius: 12,
          padding: hasFiles ? '14px' : tall ? '38px 24px' : '24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? C.accentDim : hasFiles ? C.greenDim + '44' : C.bg,
          transition: 'all .2s ease',
        }}
      >
        {!hasFiles && (
          <>
            <div style={{ fontSize: tall ? 34 : 26, marginBottom: 9 }}>{icon}</div>
            <div style={{ fontSize: 13.5, color: C.text, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 11.5, color: C.textDim }}>{hint}</div>
            {cta && <div style={{ display: 'inline-block', marginTop: 16, background: C.surface2, border: `1px solid ${C.borderBright}`, borderRadius: 9, padding: '8px 18px', fontSize: 12.5, fontWeight: 600, color: C.text }}>{cta}</div>}
          </>
        )}
        {hasFiles && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}
            onClick={e => e.stopPropagation()}>
            {value.map((uf, i) => (
              <FilePreview key={i} uf={uf} onRemove={() => removeFile(i)} />
            ))}
            {multiple && (
              <div onClick={() => inputRef.current?.click()}
                style={{ border: `1.5px dashed ${C.borderBright}`, borderRadius: 9, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textDim, fontSize: 22, transition: 'all .15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.borderBright)}>
                +
              </div>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={onInputChange}
      />
    </div>
  );
}
