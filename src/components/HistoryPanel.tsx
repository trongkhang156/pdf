import React, { useState } from "react";
import { HistoryItem } from "../types";
import { FileText, Trash2, Calendar, Clock } from "lucide-react";

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryPanel({ history, onSelect, onDelete, onClearAll }: HistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHistory = history.filter((item) =>
    item.result.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (history.length === 0) {
    return (
      <div className="bg-[#0A0A0B]/60 border border-white/5 rounded-2xl p-6 text-center shadow-inner">
        <Clock size={24} className="mx-auto text-amber-500/40 mb-2" />
        <h4 className="font-sans font-semibold text-gray-400 text-xs">Lịch sử trống</h4>
        <p className="font-sans text-[11px] text-gray-500 mt-1 leading-relaxed">
          Các tài liệu bạn dịch sẽ xuất hiện ở đây để xem lại nhanh bất kỳ lúc nào.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0B]/40 border border-white/5 rounded-2xl p-4 shadow-xl space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-serif italic text-xs text-amber-200 flex items-center gap-1.5">
          <Clock size={14} className="text-amber-400" />
          Tập tin đã dịch
          <span className="bg-amber-500/10 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border border-amber-500/20">
            {history.length}
          </span>
        </h3>
        <button
          onClick={onClearAll}
          className="text-[10px] font-sans font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 px-2 py-1 rounded-md transition-colors cursor-pointer"
        >
          Xóa hết
        </button>
      </div>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Tìm trong lịch sử..."
        className="w-full text-[11px] font-sans px-3 py-1.5 bg-[#0A0A0B] border border-white/10 rounded-lg text-gray-200 placeholder:text-gray-650 focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
      />

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredHistory.length === 0 ? (
          <p className="text-center text-xs text-gray-500 font-sans py-4">Không tìm thấy tài liệu.</p>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="group border border-white/5 hover:border-amber-500/30 bg-[#0A0A0B]/80 hover:bg-[#0D0D0F] p-3 rounded-xl transition-all duration-300 cursor-pointer text-left relative"
            >
              <div className="flex items-start gap-2.5 justify-between min-w-0 pr-6">
                <div className="p-1.5 bg-white/5 group-hover:bg-amber-500/15 text-gray-400 group-hover:text-amber-300 rounded-lg mt-0.5 shrink-0 transition-colors">
                  <FileText size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif italic text-amber-50 text-xs truncate group-hover:text-amber-200 transition-colors">
                    {item.result.title}
                  </h4>
                  <p className="font-sans text-[10px] text-gray-400 truncate mt-0.5">
                    {item.fileName}
                  </p>
                  
                  {/* Lang badges */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.result.detectedLanguages.map((lang, lIdx) => (
                      <span
                        key={lIdx}
                        className="bg-amber-500/10 text-amber-200 text-[8px] px-1.5 py-0.2 rounded font-sans uppercase font-extrabold border border-amber-500/10"
                      >
                        {lang.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Meta details footer inside card */}
              <div className="flex items-center justify-between text-[9px] text-gray-500 mt-2.5 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <Calendar size={10} className="text-gray-600" />
                  <span>{item.timestamp}</span>
                </div>
                <div className="text-[9px] font-mono text-gray-650">
                  {item.fileSize}
                </div>
              </div>

              {/* Trash Hover overlay / Action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="absolute top-2.5 right-2 p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                title="Xóa bản ghi này"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
