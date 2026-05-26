import React from "react";
import { Sparkles, MessageSquareCode, ShieldAlert, Award, FileText } from "lucide-react";

interface PresetInstructionsProps {
  customInstructions: string;
  onChange: (val: string) => void;
}

interface PresetOption {
  label: string;
  prompt: string;
  icon: React.ReactNode;
  description: string;
}

export function PresetInstructions({ customInstructions, onChange }: PresetInstructionsProps) {
  const presets: PresetOption[] = [
    {
      label: "Trang trọng",
      icon: <Award size={16} className="text-amber-200" />,
      description: "Dùng văn phong chuyên nghiệp, lịch sự để dịch báo cáo hoặc hợp đồng.",
      prompt: "Hãy dịch với văn phong lịch sự, trang trọng, công sở và cấu trúc chính xác như các văn bản hành chính."
    },
    {
      label: "Giữ thuật ngữ chuyên ngành",
      icon: <MessageSquareCode size={16} className="text-amber-300" />,
      description: "Hạn chế dịch bừa các từ viết tắt chuyên môn kỹ thuật hoặc thuật ngữ CNTT.",
      prompt: "Hãy giữ nguyên bản từ gốc trong ngoặc đơn đối với các thuật ngữ chuyên ngành kỹ thuật, CNTT, y tế hoặc kinh tế khó dịch sang tiếng Việt để người đọc dễ tra cứu."
    },
    {
      label: "Dễ hiểu, bình dị",
      icon: <Sparkles size={16} className="text-amber-400" />,
      description: "Dịch thoáng nghĩa, mượt mà giống như một người Việt bản xứ viết văn.",
      prompt: "Hãy dịch thoát ý một cách tự nhiên thuần Việt, tránh cứng nhắc, ưu tiên sự mượt mà mạch lạc dễ hiểu cho người Việt đọc thông thường."
    },
    {
      label: "Tóm lược súc tích",
      icon: <FileText size={16} className="text-amber-100" />,
      description: "Chỉ tập trung dịch các luận điểm chính và rút gọn câu kéo dài dòng.",
      prompt: "Hãy dịch tóm lược nội dung cốt lõi của từng phần chính, súc tích hóa các câu rườm rà nhưng không bỏ sót luận điểm chính."
    }
  ];

  const handlePresetSelect = (preset: PresetOption) => {
    if (customInstructions.includes(preset.prompt)) {
      // Remove it
      const updated = customInstructions
        .replace(preset.prompt, "")
        .replace(/\n\n+/g, "\n")
        .trim();
      onChange(updated);
    } else {
      // Append it
      const separator = customInstructions ? "\n\n" : "";
      onChange(`${customInstructions}${separator}${preset.prompt}`);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="font-sans font-semibold text-gray-300 text-sm block">
          Chọn phong cách dịch tự chọn (Tùy chỉnh)
        </label>
        <span className="text-[11px] font-mono text-amber-500/70">AI Engine</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {presets.map((preset) => {
          const isSelected = customInstructions.includes(preset.prompt);
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`text-left p-3.5 rounded-xl border text-xs transition-all duration-300 flex items-start gap-3 cursor-pointer ${
                isSelected
                  ? "border-amber-500 bg-amber-500/10 text-amber-200 shadow-lg"
                  : "border-white/5 hover:border-white/15 bg-white/2 hover:bg-white/5 text-gray-400"
              }`}
            >
              <div className={`p-1.5 rounded-lg mt-0.5 ${isSelected ? "bg-amber-500/20" : "bg-white/5"}`}>
                {preset.icon}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-amber-100 flex items-center gap-1.5">
                  {preset.label}
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  )}
                </div>
                <div className="text-gray-500 mt-1 leading-normal line-clamp-2">
                  {preset.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <textarea
          value={customInstructions}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nhập thêm yêu cầu dịch cụ thể của riêng bạn tại đây (ví dụ: 'Hãy dịch thơ bay bổng', 'đừng dịch các tiêu đề chương',...)"
          className="w-full text-xs font-sans text-gray-200 bg-[#0A0A0B] border border-white/10 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[85px] transition-all resize-y placeholder:text-gray-600"
          id="custom-instruction-text"
        />
        {customInstructions && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute bottom-3 right-3 text-[10px] font-sans text-amber-300 hover:text-rose-400 px-2 py-1 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
          >
            Xóa nhanh
          </button>
        )}
      </div>
    </div>
  );
}
