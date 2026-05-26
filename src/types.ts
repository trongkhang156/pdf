export interface TranslationResult {
  title: string;
  detectedLanguages: string[];
  summary: string;
  translatedHtml: string;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  fileSize: string;
  timestamp: string;
  result: TranslationResult;
}
