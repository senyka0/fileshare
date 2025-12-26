"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface FileInfo {
  id: string;
  filename: string;
  size: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
  const documentExts = ["pdf", "doc", "docx", "txt", "rtf", "odt"];
  const videoExts = ["mp4", "avi", "mov", "wmv", "flv"];
  const audioExts = ["mp3", "wav", "ogg", "flac"];
  const spreadsheetExts = ["xls", "xlsx", "csv", "ods"];
  const presentationExts = ["ppt", "pptx", "odp"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz"];

  if (imageExts.includes(ext || "")) {
    return (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  
  if (documentExts.includes(ext || "")) {
    if (ext === "pdf") {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  
  if (videoExts.includes(ext || "")) {
    return (
      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  
  if (audioExts.includes(ext || "")) {
    return (
      <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    );
  }
  
  if (spreadsheetExts.includes(ext || "")) {
    return (
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  
  if (presentationExts.includes(ext || "")) {
    return (
      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    );
  }
  
  if (archiveExts.includes(ext || "")) {
    return (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );
  }
  
  return (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
};

const formatFileSize = (sizeString: string): string => {
  const value = parseFloat(sizeString);
  
  let bytes: number;
  
  if (value > 1000000000) {
    bytes = value;
  } else {
    bytes = value * 1024 * 1024;
  }
  
  if (bytes < 1024) return bytes.toFixed(0) + " Б";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " ГБ";
};

export default function DownloadPage() {
  const params = useParams();
  const id = params.id as string;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{
    files: FileInfo[];
    totalSize: string;
    isProtected: boolean;
    isBatch: boolean;
  } | null>(null);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    async function checkFile() {
      try {
        const response = await fetch(`/api/download/${id}/info`);
        if (response.status === 404) {
          setError("Файлы не найдены или срок действия истек");
          setLoading(false);
          return;
        }
        if (!response.ok) {
          setError("Не удалось загрузить информацию о файлах");
          setLoading(false);
          return;
        }
        const data = await response.json();
        setFileData(data);
        if (!data.isProtected) {
          setPasswordVerified(true);
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to load file information:", err);
        setError("Не удалось загрузить информацию о файлах");
        setLoading(false);
      }
    }
    checkFile();
  }, [id]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`/api/download/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError("Неверный пароль");
        return;
      }

      const data = await response.json();
      setFileData(data);
      setPasswordVerified(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось проверить пароль. Пожалуйста, попробуйте снова."
      );
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(
        `/api/download/${id}?fileId=${fileId}`,
        {
          method: fileData?.isProtected ? "POST" : "GET",
          headers: fileData?.isProtected
            ? {
                "Content-Type": "application/json",
              }
            : {},
          body: fileData?.isProtected
            ? JSON.stringify({ password })
            : undefined,
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError("Требуется пароль или пароль неверен");
          setPasswordVerified(false);
        } else {
          setError(
            "Не удалось скачать файл. Пожалуйста, попробуйте снова."
          );
        }
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось скачать файл. Пожалуйста, попробуйте снова."
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <p className="text-gray-600 text-sm sm:text-base">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error && !fileData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
            Скачать файлы
          </h1>
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm sm:text-base text-red-800 break-words">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (fileData?.isProtected && !passwordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
            Скачать файлы
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Эти файлы защищены паролем.
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
              >
                Пароль
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 text-base text-gray-900 sm:text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm sm:text-base text-red-800 break-words">{error}</p>
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-4 px-6 rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors font-medium text-base shadow-md hover:shadow-lg"
            >
              Проверить пароль
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
          Скачать файлы
        </h1>

        {fileData && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm sm:text-base font-medium text-gray-700">
                Всего файлов: {fileData.files.length}
              </label>
              <p className="mt-2 text-sm sm:text-base text-gray-900 bg-gray-50 p-3 rounded-xl">
                Общий размер: {formatFileSize(fileData.totalSize)}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm sm:text-base font-medium text-gray-700 block">
                Файлы для скачивания:
              </label>
              {fileData.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.filename)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-all">
                        {file.filename}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(file.id, file.filename)}
                    className="ml-4 flex-shrink-0 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors font-medium text-sm shadow-md hover:shadow-lg"
                  >
                    Скачать
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm sm:text-base text-red-800 break-words">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
