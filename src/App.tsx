import React, { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { UploadZone } from "./components/UploadZone";
import { TranslationResults } from "./components/TranslationResults";
import { TranslationResult } from "./types";
import { extractImagesFromPdf } from "./utils/pdfExtractor";

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [extractedImages, setExtractedImages] = useState<string[]>([]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
    setExtractedImages([]);
    try {
      // Proactively extract images in the background
      const imgUrls = await extractImagesFromPdf(file);
      setExtractedImages(imgUrls);
    } catch (e) {
      console.error("Lỗi trích xuất ảnh nền:", e);
    }
  };

  const handleFileClear = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setExtractedImages([]);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        const cleanBase64 = base64String.split(",")[1] || base64String;
        resolve(cleanBase64);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleTranslate = async () => {
    if (!selectedFile) {
      setError("Vui lòng tải lên một tệp PDF trước.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      let currentImages = extractedImages;
      if (currentImages.length === 0) {
        setStatusText("Đang phân tích định dạng hình ảnh và logo từ tệp PDF gốc...");
        currentImages = await extractImagesFromPdf(selectedFile);
        setExtractedImages(currentImages);
      }

      setStatusText("Đang chuyển đổi mã hóa tệp PDF...");
      const pdfBase64 = await convertFileToBase64(selectedFile);
      
      setStatusText("Dịch thuật tài liệu...");
      
      const response = await fetch("/api/translate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfBase64,
          customInstructions: customInstructions.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi máy chủ (${response.status})`);
      }

      const data: TranslationResult = await response.json();
      setResult(data);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra sự cố trong quá trình dịch thuật tài liệu PDF này.");
    } finally {
      setIsLoading(false);
      setStatusText("");
    }
  };

  const handlePresetClick = (prompt: string) => {
    setCustomInstructions(prompt);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0B] text-[#E0E0E0] font-sans antialiased" id="main-root-container">
      {/* Simple, Non-intrusive Header */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0F0F12] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          
          <div className="flex flex-col">
            <span className="text-base font-serif italic tracking-wide text-amber-100 leading-none">
             
            </span>
          
          </div>
        </div>
        <div className="flex items-center gap-2 text-amber-200/80 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-medium">
         
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-5xl w-full mx-auto">
        {!result ? (
          // Simple Translation Action Center Card
          <div className="w-full max-w-2xl bg-[#0F0F12] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
          
           
            </div>

            {/* Step 1: Upload File */}
            <div className="space-y-3">
              <UploadZone 
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                onFileClear={handleFileClear}
              />
            </div>

            {/* Action Execution */}
            {selectedFile && (
              <div className="space-y-4 pt-4 border-t border-white/5">
                {isLoading ? (
                  <div className="bg-[#0A0A0B] border border-white/5 rounded-xl p-5 text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="font-sans font-medium text-amber-100 text-xs">Đang xử lý dịch thuật...</p>
                      <p className="font-mono text-[10px] text-amber-400/60 max-w-sm mx-auto leading-normal">
                        {statusText}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleTranslate}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-300 to-amber-500 text-black font-extrabold rounded-xl hover:from-amber-450 hover:to-amber-550 transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-[0.99] cursor-pointer text-sm shadow-lg shadow-amber-500/10"
                  >
                    <Sparkles size={16} />
                    Dịch sang Tiếng Việt ngay
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-950/25 border border-rose-500/20 rounded-xl flex items-start gap-3 text-xs">
                <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={14} />
                <div className="space-y-1 text-rose-200">
                  <strong className="block font-semibold">Lỗi xảy ra:</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // High quality translation display results page with single retry/another doc btn
          <div className="w-full space-y-6 animate-fadeIn">
            <TranslationResults 
              result={result}
              fileName={selectedFile ? selectedFile.name : "Tài liệu"}
              selectedFile={selectedFile}
              extractedImages={extractedImages}
              onReset={handleFileClear}
            />
          </div>
        )}
      </main>

    
    </div>
  );
}
