"use client";

import { useState, useRef, DragEvent } from "react";

const EXPIRATION_OPTIONS = [
  { value: 1, label: "1 час" },
  { value: 6, label: "6 часов" },
  { value: 12, label: "12 часов" },
  { value: 24, label: "24 часа" },
  { value: 72, label: "3 дня" },
  { value: 168, label: "7 дней" },
];

interface SelectedFile {
  id: string;
  file: File;
}

interface UploadResult {
  downloadUrl: string;
  password?: string;
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expirationHours, setExpirationHours] = useState(24);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelected(droppedFiles);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFilesSelected(selectedFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setError(null);
    const newFiles: SelectedFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Пожалуйста, выберите файлы для загрузки");
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      selectedFiles.forEach((selectedFile) => {
        formData.append("file", selectedFile.file);
      });

      formData.append("expirationHours", expirationHours.toString());
      formData.append("passwordProtected", passwordProtected.toString());

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const newResult: UploadResult = {
              downloadUrl: data.url,
              password: data.password,
            };
            setUploadResults((prev) => [newResult, ...prev]);
            setSelectedFiles([]);
            setUploadProgress(100);
          } catch {
            setError("Не удалось обработать ответ сервера");
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            setError(data.error || "Ошибка загрузки");
          } catch {
            setError("Ошибка загрузки");
          }
        }
      });

      xhr.addEventListener("error", () => {
        setIsUploading(false);
        setError("Ошибка сети");
      });

      xhr.addEventListener("abort", () => {
        setIsUploading(false);
        setError("Загрузка отменена");
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    } catch (err) {
      console.error("Upload error:", err);
      setIsUploading(false);
      setError("Ошибка загрузки");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " ГБ";
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      console.error("Failed to copy");
    }
  };

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
        <svg
          className="w-5 h-5 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    }

    if (documentExts.includes(ext || "")) {
      if (ext === "pdf") {
        return (
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      }
      return (
        <svg
          className="w-5 h-5 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    }

    if (videoExts.includes(ext || "")) {
      return (
        <svg
          className="w-5 h-5 text-purple-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      );
    }

    if (audioExts.includes(ext || "")) {
      return (
        <svg
          className="w-5 h-5 text-yellow-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      );
    }

    if (spreadsheetExts.includes(ext || "")) {
      return (
        <svg
          className="w-5 h-5 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      );
    }

    if (presentationExts.includes(ext || "")) {
      return (
        <svg
          className="w-5 h-5 text-orange-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      );
    }

    if (archiveExts.includes(ext || "")) {
      return (
        <svg
          className="w-5 h-5 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      );
    }

    return (
      <svg
        className="w-5 h-5 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="max-w-2xl w-full space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            className="space-y-6"
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                className="hidden"
                multiple
              />
              <div className="flex flex-col items-center gap-4">
                <svg
                  className="w-16 h-16 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div>
                  <p className="text-gray-700 text-base sm:text-lg font-medium mb-2">
                    Перетащите или нажмите здесь, чтобы добавить файлы
                  </p>
                  <p className="text-gray-500 text-sm">
                    JPEG, PNG, PDF, ZIP (макс. размер 10 ГБ)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <select
                  id="expiration"
                  value={expirationHours}
                  onChange={(e) => setExpirationHours(Number(e.target.value))}
                  className="block w-full px-4 py-3 text-gray-900 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="passwordProtected"
                  onClick={() => setPasswordProtected(!passwordProtected)}
                  className={`ml-1 relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    passwordProtected
                      ? "focus:ring-[#6BC1FB]"
                      : "focus:ring-gray-300"
                  }`}
                  style={{
                    backgroundColor: passwordProtected ? "#6BC1FB" : "#D6EFFF",
                  }}
                  role="switch"
                  aria-checked={passwordProtected}
                >
                  <span
                    className={`inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      passwordProtected
                        ? "translate-x-[22px]"
                        : "translate-x-0.5"
                    }`}
                  >
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M21.7071 2.29289C22.0976 2.68342 22.0976 3.31658 21.7071 3.70711L21.1642 4.24999L22.789 5.87475C23.57 6.6558 23.57 7.92213 22.789 8.70317L20.3126 11.1796C19.5315 11.9606 18.2652 11.9606 17.4842 11.1796L15.8594 9.55482L12.7489 12.6653C13.5356 13.7403 14 15.0659 14 16.5C14 20.0899 11.0899 23 7.5 23C3.91015 23 1 20.0899 1 16.5C1 12.9101 3.91015 10 7.5 10C8.9341 10 10.2597 10.4644 11.3347 11.2511L20.2929 2.29289C20.6834 1.90237 21.3166 1.90237 21.7071 2.29289ZM17.2736 8.14061L18.8984 9.76537L21.3748 7.28896L19.75 5.6642L17.2736 8.14061ZM7.5 12C5.01472 12 3 14.0147 3 16.5C3 18.9853 5.01472 21 7.5 21C9.98528 21 12 18.9853 12 16.5C12 14.0147 9.98528 12 7.5 12Z"
                        fill="#6BC1FB"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800 break-words">{error}</p>
            </div>
          )}
        </div>

        {selectedFiles.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Выбранные файлы ({selectedFiles.length})
            </h2>
            <div className="space-y-4">
              <div className="space-y-3">
                {selectedFiles.map((selectedFile) => (
                  <div
                    key={selectedFile.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl"
                  >
                    <div className="flex-shrink-0">
                      {getFileIcon(selectedFile.file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(selectedFile.file.size)}
                      </p>
                    </div>
                    {!isUploading && (
                      <button
                        onClick={() => removeFile(selectedFile.id)}
                        className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                        title="Удалить"
                      >
                        <svg
                          className="w-5 h-5 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isUploading ? (
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      Загрузка файлов...
                    </p>
                    <p className="text-sm text-gray-500">{uploadProgress}%</p>
                  </div>
                  <div
                    className="w-full rounded-full h-4"
                    style={{ backgroundColor: "#D6EFFF" }}
                  >
                    <div
                      className="h-4 rounded-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                        backgroundColor: "#6BC1FB",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleUpload}
                  className="w-full bg-blue-500 text-white py-4 px-6 rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors font-medium text-base shadow-md hover:shadow-lg mt-4"
                >
                  Загрузить файлы
                </button>
              )}
            </div>
          </div>
        )}

        {uploadResults.map((result, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                Файлы успешно загружены!
              </p>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.05025 1.53553C8.03344 0.552348 9.36692 0 10.7574 0C13.6528 0 16 2.34721 16 5.24264C16 6.63308 15.4477 7.96656 14.4645 8.94975L12.4142 11L11 9.58579L13.0503 7.53553C13.6584 6.92742 14 6.10264 14 5.24264C14 3.45178 12.5482 2 10.7574 2C9.89736 2 9.07258 2.34163 8.46447 2.94975L6.41421 5L5 3.58579L7.05025 1.53553Z"
                      fill="#A3D6EF"
                    />
                    <path
                      d="M7.53553 13.0503L9.58579 11L11 12.4142L8.94975 14.4645C7.96656 15.4477 6.63308 16 5.24264 16C2.34721 16 0 13.6528 0 10.7574C0 9.36693 0.552347 8.03344 1.53553 7.05025L3.58579 5L5 6.41421L2.94975 8.46447C2.34163 9.07258 2 9.89736 2 10.7574C2 12.5482 3.45178 14 5.24264 14C6.10264 14 6.92742 13.6584 7.53553 13.0503Z"
                      fill="#A3D6EF"
                    />
                    <path
                      d="M5.70711 11.7071L11.7071 5.70711L10.2929 4.29289L4.29289 10.2929L5.70711 11.7071Z"
                      fill="#A3D6EF"
                    />
                  </svg>
                </div>
                <p className="flex-1 text-xs font-mono text-blue-900 break-all select-all">
                  {result.downloadUrl}
                </p>
                <button
                  onClick={() => copyToClipboard(result.downloadUrl)}
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                  title="Копировать ссылку"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="#A3D6EF"
                      fillRule="evenodd"
                      d="M4 2a2 2 0 00-2 2v9a2 2 0 002 2h2v2a2 2 0 002 2h9a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H4zm9 4V4H4v9h2V8a2 2 0 012-2h5zM8 8h9v9H8V8z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {result.password && (
              <div className="p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M21.7071 2.29289C22.0976 2.68342 22.0976 3.31658 21.7071 3.70711L21.1642 4.24999L22.789 5.87475C23.57 6.6558 23.57 7.92213 22.789 8.70317L20.3126 11.1796C19.5315 11.9606 18.2652 11.9606 17.4842 11.1796L15.8594 9.55482L12.7489 12.6653C13.5356 13.7403 14 15.0659 14 16.5C14 20.0899 11.0899 23 7.5 23C3.91015 23 1 20.0899 1 16.5C1 12.9101 3.91015 10 7.5 10C8.9341 10 10.2597 10.4644 11.3347 11.2511L20.2929 2.29289C20.6834 1.90237 21.3166 1.90237 21.7071 2.29289ZM17.2736 8.14061L18.8984 9.76537L21.3748 7.28896L19.75 5.6642L17.2736 8.14061ZM7.5 12C5.01472 12 3 14.0147 3 16.5C3 18.9853 5.01472 21 7.5 21C9.98528 21 12 18.9853 12 16.5C12 14.0147 9.98528 12 7.5 12Z"
                        fill="#A3D6EF"
                      />
                    </svg>
                  </div>
                  <p className="flex-1 text-xs font-mono text-yellow-900 break-all select-all">
                    {result.password}
                  </p>
                  <button
                    onClick={() => copyToClipboard(result.password!)}
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                    title="Копировать пароль"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill="#A3D6EF"
                        fillRule="evenodd"
                        d="M4 2a2 2 0 00-2 2v9a2 2 0 002 2h2v2a2 2 0 002 2h9a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H4zm9 4V4H4v9h2V8a2 2 0 012-2h5zM8 8h9v9H8V8z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
