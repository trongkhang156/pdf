import React, { useState, useRef, useEffect } from "react";
import { TranslationResult } from "../types";
import { 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Languages, 
  RotateCcw, 
  CheckCircle2,
  Printer,
  Eye
} from "lucide-react";

interface TranslationResultsProps {
  result: TranslationResult;
  fileName: string;
  selectedFile: File | null;
  extractedImages?: string[];
  onReset: () => void;
}

export function TranslationResults({ result, fileName, selectedFile, extractedImages = [], onReset }: TranslationResultsProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "translation" | "original">("split");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const docRef = useRef<HTMLDivElement>(null);

  // State to hold custom image orientation transformations: rotation (deg), flip vertically, flip horizontally
  const [transforms, setTransforms] = useState<Record<number, { r: number; fV: boolean; fH: boolean }>>({});

  // Bind global handler for dangerouslySetInnerHTML native button click triggers
  useEffect(() => {
    (window as any).handleImageAction = (index: number, action: "rotateL" | "rotateR" | "flipV" | "flipH") => {
      setTransforms((prev) => {
        const current = prev[index] || { r: 0, fV: false, fH: false };
        let nextRotate = current.r;
        let nextFlipV = current.fV;
        let nextFlipH = current.fH;

        if (action === "rotateR") {
          nextRotate = (current.r + 90) % 360;
        } else if (action === "rotateL") {
          nextRotate = (current.r - 90 + 360) % 360;
        } else if (action === "flipV") {
          nextFlipV = !current.fV;
        } else if (action === "flipH") {
          nextFlipH = !current.fH;
        }

        return {
          ...prev,
          [index]: { r: nextRotate, fV: nextFlipV, fH: nextFlipH }
        };
      });
    };
    return () => {
      delete (window as any).handleImageAction;
    };
  }, []);

  const processedHtml = React.useMemo(() => {
    const html = result.translatedHtml;
    if (typeof window === "undefined" || !extractedImages || extractedImages.length === 0) {
      return html;
    }
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const placeholders = doc.querySelectorAll(".document-image-placeholder");
      
      placeholders.forEach((placeholder) => {
        const indexStr = placeholder.getAttribute("data-index");
        if (indexStr !== null) {
          const index = parseInt(indexStr, 10);
          if (!isNaN(index) && extractedImages[index]) {
            const container = doc.createElement("div");
            container.className = "my-4 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-150 bg-slate-50/50 shadow-sm max-w-md mx-auto print:break-inside-avoid img-container-wrapper";
            
            const imgWrapper = doc.createElement("div");
            imgWrapper.className = "relative flex items-center justify-center p-1 bg-white border border-gray-100 rounded-lg overflow-hidden";
            imgWrapper.style.maxWidth = "100%";
            imgWrapper.style.maxHeight = "320px";
            
            const img = doc.createElement("img");
            img.src = extractedImages[index];
            img.alt = placeholder.textContent || "Hình ảnh tệp gốc";
            img.className = "max-w-full max-h-[290px] object-contain rounded transition-transform duration-200 pdf-extracted-image";
            img.referrerPolicy = "no-referrer";
            img.setAttribute("id", `embedded-img-${index}`);
            
            const t = transforms[index] || { r: 0, fV: false, fH: false };
            img.style.transform = `rotate(${t.r}deg) scale(${t.fH ? -1 : 1}, ${t.fV ? -1 : 1})`;
            
            imgWrapper.appendChild(img);
            container.appendChild(imgWrapper);
            
            const desc = doc.createElement("span");
            desc.className = "text-[9px] text-gray-400 mt-1.5 font-sans font-medium tracking-wide text-center uppercase";
            desc.textContent = `🖼️ ${placeholder.textContent || "Hình ảnh trích xuất"}`;
            container.appendChild(desc);

            // Add clean Vietnamese horizontal toolbar controls below the image container
            const toolbar = doc.createElement("div");
            toolbar.className = "mt-2.5 flex flex-wrap items-center justify-center gap-1.5 no-print";
            toolbar.innerHTML = `
              <button type="button" onclick="window.handleImageAction(${index}, 'rotateL')" class="flex items-center gap-0.5 px-2 py-1 text-[11px] font-sans font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-amber-600 transition cursor-pointer shadow-sm active:scale-95">
                ↩️ Xoay trái
              </button>
              <button type="button" onclick="window.handleImageAction(${index}, 'rotateR')" class="flex items-center gap-0.5 px-2 py-1 text-[11px] font-sans font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-amber-600 transition cursor-pointer shadow-sm active:scale-95">
                ↪️ Xoay phải
              </button>
              <button type="button" onclick="window.handleImageAction(${index}, 'flipV')" class="flex items-center gap-0.5 px-2 py-1 text-[11px] font-sans font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-amber-600 transition cursor-pointer shadow-sm active:scale-95">
                ↕️ Lật dọc
              </button>
              <button type="button" onclick="window.handleImageAction(${index}, 'flipH')" class="flex items-center gap-0.5 px-2 py-1 text-[11px] font-sans font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-amber-600 transition cursor-pointer shadow-sm active:scale-95">
                ↔️ Lật ngang
              </button>
            `;
            container.appendChild(toolbar);
            
            placeholder.parentNode?.replaceChild(container, placeholder);
          }
        }
      });
      
      return doc.body.innerHTML;
    } catch (e) {
      console.error("Lỗi đồng bộ hình ảnh PDF:", e);
      return html;
    }
  }, [result.translatedHtml, extractedImages, transforms]);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPdfUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [selectedFile]);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(result.summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleCopyAllText = async () => {
    // Strip HTML tags for clean clipboard copying
    const tempElement = document.createElement("div");
    tempElement.innerHTML = result.translatedHtml;
    const plainText = tempElement.textContent || tempElement.innerText || "";
    
    const clipboardContent = `=== BẢN DỊCH TIẾNG VIỆT CHUẨN XÁC: ${result.title} ===\n\n` +
      `Tài liệu gốc: ${fileName}\n` +
      `Ngôn ngữ nhận diện: ${result.detectedLanguages.join(", ")}\n\n` +
      `--- TÓM TẮT NỘI DUNG ---\n${result.summary}\n\n` +
      `--- NỘI DUNG BẢN DỊCH CHI TIẾT ---\n\n${plainText}`;

    try {
      await navigator.clipboard.writeText(clipboardContent);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleDownloadTxt = () => {
    const tempElement = document.createElement("div");
    tempElement.innerHTML = result.translatedHtml;
    const plainText = tempElement.textContent || tempElement.innerText || "";
    
    const fullContent = `--- BẢN DỊCH: ${result.title} ---\n` +
      `Tài liệu gốc: ${fileName}\n` +
      `Ngôn ngữ gốc nhận diện: ${result.detectedLanguages.join(", ")}\n\n` +
      `=== TÓM TẮT TỔNG QUAN ===\n${result.summary}\n\n` +
      `=== CHI TIẾT BẢN DỊCH CHUẨN XÁC ===\n\n${plainText}`;

    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanOrigName = fileName.replace(/\.[^/.]+$/, "");
    link.download = `Ban-dich_${cleanOrigName}_TiengViet.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    const cleanOrigName = fileName.replace(/\.[^/.]+$/, "");
    const docTitle = `Ban-dich_${cleanOrigName}_TiengViet`;

    const detectedLangBadges = result.detectedLanguages.map(lang => `
      <span class="badge">${lang}</span>
    `).join('');

    const htmlContent = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${result.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      line-height: 1.75;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px 20px;
    }
    .print-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 50px 60px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    .system-banner {
      background-color: #0d1117;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #cbd5e1;
    }
    .btn-print {
      background: #d97706;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.15s ease;
    }
    .btn-print:hover {
      background: #b56005;
    }
    .meta-tag {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #d97706;
      margin-bottom: 6px;
      display: block;
    }
    h1 {
      font-size: 28px;
      color: #0f172a;
      margin: 0 0 16px 0;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
    }
    .stats-bar {
      display: flex;
      gap: 24px;
      font-size: 12px;
      color: #475569;
      margin-bottom: 30px;
      flex-wrap: wrap;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 14px;
    }
    .badge-container {
      display: inline-flex;
      gap: 4px;
    }
    .badge {
      background-color: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }
    .summary-box {
      background-color: #f8fafc;
      border-left: 4px solid #d97706;
      padding: 20px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 35px;
      border-top: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-text {
      font-size: 13px;
      color: #334155;
      margin: 0;
    }
    .document-body {
      font-size: 14px;
      color: #1e293b;
    }
    .document-body h1, .document-body h2, .document-body h3, .document-body h4 {
      color: #0f172a;
      font-weight: 700;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .document-body h1 { font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .document-body h2 { font-size: 17px; }
    .document-body h3 { font-size: 15px; }
    .document-body p {
      margin-top: 0;
      margin-bottom: 14px;
      text-align: justify;
    }
    .document-body ul, .document-body ol {
      margin-top: 0;
      margin-bottom: 14px;
      padding-left: 20px;
    }
    .document-body li {
      margin-bottom: 4px;
    }
    .document-body table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .document-body th, .document-body td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      text-align: left;
    }
    .document-body th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }
    .document-body strong {
      color: #0d1117;
    }
    .document-image-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background-color: #f8fafc;
      border: 1.5px dashed #cbd5e1;
      padding: 12px 16px;
      border-radius: 8px;
      color: #64748b;
      font-size: 11px;
      font-weight: 500;
      margin: 18px 0;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.01);
    }
    .document-image-placeholder::before {
      content: "🖼️";
      font-size: 14px;
    }
    .print-footer {
      text-align: center;
      margin-top: 50px;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .print-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .system-banner {
        display: none;
      }
      .no-print {
        display: none !important;
      }
      body {-webkit-print-color-adjust: exact;}
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="system-banner">
      <div>
        <strong>Văn Bản Việt Pro</strong> &bull; Trình dịch thuật bảo toàn định dạng cũ
      </div>
      <button class="btn-print" onclick="window.print()">Khởi động hộp thoại in / Xuất PDF</button>
    </div>
    
    <span class="meta-tag">Tài liệu gốc: ${fileName}</span>
    <h1>${result.title}</h1>
    
    <div class="stats-bar">
      <div class="stats-item">Ngôn ngữ gốc nhận diện: <span class="badge-container">${detectedLangBadges}</span></div>
      <div class="stats-item">Ngày kết xuất: <strong>${new Date().toLocaleDateString('vi-VN')}</strong></div>
    </div>
    
    <div class="summary-box">
      <div class="summary-title">Tóm tắt văn bản</div>
      <p class="summary-text">${result.summary.replace(/\n/g, '<br>')}</p>
    </div>
    
    <div class="document-body">
      ${processedHtml}
    </div>
    
    <div class="print-footer">
      Dịch thuật từ động dạng bảo lưu cấu trúc &bull; Văn Bản Việt Pro &bull; Bảo mật thông tin tuyệt đối
    </div>
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docTitle}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto" id="translation-output-container">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#0F0F12] border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="min-w-0 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-300 rounded-lg shrink-0">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif italic text-sm text-white truncate max-w-[240px] md:max-w-md">
              {result.title}
            </h2>
            <p className="text-[10px] text-gray-500 truncate">Tài liệu gốc: {fileName}</p>
          </div>
        </div>

        {/* Action button bar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyAllText}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all text-xs flex items-center gap-1.5 font-medium cursor-pointer border border-white/5"
            title="Sao chép toàn bộ văn bản dịch"
          >
            {copiedAll ? <Check size={13} className="text-amber-400" /> : <Copy size={13} />}
            <span>Sao chép</span>
          </button>

          <button
            onClick={handleDownloadTxt}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all text-xs flex items-center gap-1.5 font-medium cursor-pointer border border-white/5"
            title="Tải văn bản thô .txt"
          >
            <Download size={13} />
            <span>Xuất .TXT</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="px-4 py-2 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-450 hover:to-amber-550 text-black font-extrabold rounded-lg transition-all text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
            title="Xuất bản dịch chuẩn dạng PDF giữ nguyên format cũ"
          >
            <Printer size={13} />
            <span>Xuất PDF / Bản In</span>
          </button>
        </div>
      </div>

      {/* Metadata & Summary & VIEW MODE SWITCHER */}
      <div className="bg-[#0F0F12] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Languages size={15} className="text-amber-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Ngôn ngữ phát hiện:
            </span>
            <div className="flex gap-1.5 pl-1.5 animate-fadeIn">
              {result.detectedLanguages.map((lang, i) => (
                <span key={i} className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] text-amber-200 font-bold font-sans">
                  {lang}
                </span>
              ))}
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "split"
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-500/5 font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Languages size={12} />
              <span>Xem Song Song (Có hình)</span>
            </button>
            <button
              onClick={() => setViewMode("translation")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "translation"
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-500/5 font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Eye size={12} />
              <span>Chỉ Bản Dịch</span>
            </button>
            <button
              onClick={() => setViewMode("original")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "original"
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-500/5 font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FileText size={12} />
              <span>Chỉ File Gốc</span>
            </button>
          </div>
        </div>

        <div className="bg-[#0A0A0B] border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-serif italic text-amber-200 text-xs flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-amber-400" />
              Tóm tắt tổng quan văn bản
            </h3>
            <button
              onClick={handleCopySummary}
              className="text-[10px] text-gray-500 hover:text-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copiedSummary ? <Check size={11} className="text-amber-400" /> : <Copy size={11} />}
              <span>{copiedSummary ? "Đã chép" : "Sao chép tóm tắt"}</span>
            </button>
          </div>
          <p className="font-sans text-xs text-gray-300 leading-relaxed whitespace-pre-line">
            {result.summary}
          </p>
        </div>
      </div>

      {/* Main Display Pane based on selected view mode */}
      <div className="w-full">
        {viewMode === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Hand: Original PDF showcasing exact images, graphs, layout */}
            <div className="lg:col-span-5 flex flex-col space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  📁 File gốc cũ (Bảo lưu hình ảnh/đồ thị gốc)
                </span>
              </div>
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-[650px] md:h-[750px] border border-white/10 rounded-2xl bg-white shadow-2xl"
                  title="Tài liệu PDF gốc"
                />
              ) : (
                <div className="w-full h-[600px] bg-[#0F0F12] border border-white/10 rounded-2xl flex items-center justify-center text-xs text-gray-500 italic">
                  Không thể tải tài liệu gốc.
                </div>
              )}
            </div>

            {/* Right Hand: Translated Document */}
            <div className="lg:col-span-7 flex flex-col space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-bold text-amber-200 uppercase tracking-widest flex items-center gap-1.5">
                  🇻🇳 Bản Dịch Tiếng Việt song song đối chiếu
                </span>
              </div>
              <div className="bg-white text-[#1e293b] rounded-2xl p-6 md:p-10 shadow-2xl border border-gray-200 h-[650px] md:h-[750px] overflow-y-auto relative styled-scrollbar">
                <div className="absolute top-4 right-6 text-[9px] font-mono text-gray-300 font-bold uppercase tracking-widest">
                  Tiếng Việt &bull; Format Chuẩn
                </div>
                <div 
                  ref={docRef}
                  className="document-body prose prose-slate max-w-none text-xs md:text-sm leading-relaxed"
                  style={{
                    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                    textAlign: "justify"
                  }}
                >
                  <div 
                    dangerouslySetInnerHTML={{ __html: processedHtml }} 
                    className="space-y-4"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === "translation" && (
          <div className="bg-white text-[#1e293b] rounded-2xl p-6 md:p-12 shadow-2xl border border-gray-200 max-w-4xl mx-auto relative animate-fadeIn">
            <div className="absolute top-4 right-6 text-[9px] font-mono text-gray-300 font-bold uppercase tracking-widest">
              Bản dịch tiếng Việt
            </div>
            <div 
              className="document-body prose prose-slate max-w-none text-sm leading-relaxed"
              style={{
                fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                textAlign: "justify"
              }}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: processedHtml }} 
                className="space-y-4"
              />
            </div>
          </div>
        )}

        {viewMode === "original" && (
          <div className="max-w-4xl mx-auto space-y-2 animate-fadeIn">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2">
              File gốc gốc nguyên vẹn (Đầy đủ tất cả định dạng, hình minh họa)
            </div>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[750px] border border-white/10 rounded-2xl bg-white shadow-2xl"
                title="Tài liệu PDF gốc đầy đủ"
              />
            ) : (
              <div className="w-full h-[600px] bg-[#0F0F12] border border-white/10 rounded-2xl flex items-center justify-center text-xs text-gray-500 italic">
                Không tìm thấy nguồn tài liệu gốc.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Translate another document button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-6 py-3 border border-amber-500/30 text-amber-200 hover:text-white hover:border-amber-400 hover:bg-amber-500/5 rounded-xl font-sans text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          <RotateCcw size={14} />
          Dịch tài liệu PDF khác
        </button>
      </div>

      {/* Styles */}
      <style>{`
        .styled-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .styled-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .document-body h1, .document-body h2, .document-body h3, .document-body h4 {
          color: #0f172a;
          font-weight: 700;
          margin-top: 18px;
          margin-bottom: 10px;
        }
        .document-body h1 {
          font-size: 18px;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 5px;
        }
        .document-body h2 {
          font-size: 15px;
        }
        .document-body h3 {
          font-size: 13.5px;
        }
        .document-body p {
          margin-top: 0;
          margin-bottom: 10px;
          line-height: 1.7;
          color: #334155;
        }
        .document-body ul, .document-body ol {
          margin-top: 0;
          margin-bottom: 10px;
          padding-left: 18px;
        }
        .document-body li {
          margin-bottom: 3px;
          color: #334155;
        }
        .document-body table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          margin-bottom: 12px;
          font-size: 12px;
        }
        .document-body th, .document-body td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
        }
        .document-body th {
          background-color: #f1f5f9;
          font-weight: 600;
          color: #334155;
        }
        .document-body strong {
          color: #000000;
        }
        .document-body .document-image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background-color: #f8fafc;
          border: 1.5px dashed #cbd5e1;
          padding: 14px 18px;
          border-radius: 10px;
          color: #64748b;
          font-size: 11px;
          font-weight: 500;
          margin: 16px 0;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
        }
        .document-body .document-image-placeholder::before {
          content: "🖼️";
          font-size: 14px;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
