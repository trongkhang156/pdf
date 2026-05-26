import React, { useRef, useState } from "react";
import { FileUp, FileText, Trash2, AlertCircle } from "lucide-react";

interface UploadZoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function UploadZone({ selectedFile, onFileSelect, onFileClear }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndSelectFile = (file: File) => {
    setError(null);
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setError("Chỉ chấp nhận tệp định dạng PDF (.pdf). Vui lòng thử lại.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Dung lượng tệp tối đa là 20MB. Vui lòng chọn tệp nhỏ hơn.");
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,application/pdf"
        className="hidden"
        id="pdf-file-picker"
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[180px] group ${
            isDragging
              ? "border-amber-400 bg-amber-500/10"
              : "border-white/10 hover:border-amber-500/50 hover:bg-white/5 bg-[#0F0F12] shadow-xl"
          }`}
          id="dropzone-area"
        >
          <div className="p-4 bg-amber-500/10 text-amber-400 rounded-full mb-3 group-hover:scale-110 transition-transform duration-300">
            <FileUp size={32} />
          </div>
          <p className="font-sans font-medium text-amber-100 text-sm mb-1">
            Kéo thả tệp PDF vào đây, hoặc <span className="text-amber-400 font-semibold group-hover:underline">nhấp để duyệt tệp</span>
          </p>
          <p className="font-sans text-xs text-gray-400">
           
          </p>

          {isDragging && (
            <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
              <span className="text-amber-300 font-semibold text-sm">Thả tệp ra ở đây!</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-amber-500/20 rounded-xl bg-amber-500/5 p-5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-amber-500/10 text-amber-300 rounded-lg">
              <FileText size={28} />
            </div>
            <div className="min-w-0">
              <h4 className="font-sans font-semibold text-amber-100 text-sm truncate max-w-[280px] md:max-w-md">
                {selectedFile.name}
              </h4>
              <p className="font-mono text-xs text-amber-400/60 mt-0.5">
                Dung lượng: {formatBytes(selectedFile.size)}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileClear();
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="p-2 text-gray-450 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            title="Gỡ bỏ tệp này"
            id="clear-file-button"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-3 p-3 text-xs bg-rose-550/10 text-rose-300 rounded-lg border border-rose-500/20">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
