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

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expirationHours, setExpirationHours] = useState(24);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [uploadedExpirationHours, setUploadedExpirationHours] = useState<
    number | null
  >(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File) => {
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setDownloadUrl(null);
    }
  };

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
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileChange(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Пожалуйста, выберите файл");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("expirationHours", expirationHours.toString());
      formData.append("passwordProtected", passwordProtected.toString());

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Загрузка не удалась. Пожалуйста, попробуйте снова. Если проблема сохраняется, пожалуйста, свяжитесь с поддержкой."
        );
        return;
      }

      setDownloadUrl(data.url);
      if (data.password) {
        setPassword(data.password);
      }
      setUploadedExpirationHours(expirationHours);
      setFile(null);
      setPasswordProtected(false);
      setExpirationHours(24);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Загрузка не удалась. Пожалуйста, попробуйте снова. Если проблема сохраняется, пожалуйста, свяжитесь с поддержкой."
      );
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " ГБ";
  };

  const copyToClipboard = async (text: string, type: "url" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "url") {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      } else {
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="max-w-2xl w-full space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                disabled={uploading}
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
                    Перетащите или нажмите здесь, чтобы добавить файл
                  </p>
                  <p className="text-gray-500 text-sm">
                    JPEG, PNG, PDF, ZIP (макс. размер 10 ГБ)
                  </p>
                </div>
                {file && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl w-full">
                    <p className="text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="expiration"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Ссылка истекает через
                </label>
                <select
                  id="expiration"
                  value={expirationHours}
                  onChange={(e) => setExpirationHours(Number(e.target.value))}
                  className="block w-full px-4 py-3 text-gray-900 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={uploading}
                >
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="passwordProtected"
                  checked={passwordProtected}
                  onChange={(e) => setPasswordProtected(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={uploading}
                />
                <label
                  htmlFor="passwordProtected"
                  className="ml-3 block text-sm text-gray-700"
                >
                  Защитить паролем
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full bg-blue-500 text-white py-4 px-6 rounded-xl hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-base shadow-md hover:shadow-lg"
            >
              {uploading ? "Загрузка..." : "Загрузить файл"}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800 break-words">{error}</p>
            </div>
          )}

          {downloadUrl && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-medium text-green-800 mb-2">
                Загрузка успешна!
              </p>
              {uploadedExpirationHours && (
                <p className="text-sm text-green-700">
                  Ссылка истекает через{" "}
                  {EXPIRATION_OPTIONS.find(
                    (opt) => opt.value === uploadedExpirationHours
                  )?.label || `${uploadedExpirationHours} часов`}
                </p>
              )}
            </div>
          )}
        </div>
        {downloadUrl && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={downloadUrl}
                readOnly
                className="flex-1 px-4 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => copyToClipboard(downloadUrl, "url")}
                className="flex-shrink-0 w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-colors"
                title="Копировать ссылку"
              >
                {urlCopied ? (
                  <svg
                    className="w-5 h-5 text-white"
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
                ) : (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {password && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-200 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-yellow-800"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  </div>
                  <p className="flex-1 text-xs font-mono text-yellow-900 break-all select-all">
                    {password}
                  </p>
                  <button
                    onClick={() => copyToClipboard(password, "password")}
                    className="flex-shrink-0 w-8 h-8 bg-yellow-200 hover:bg-yellow-300 rounded-lg flex items-center justify-center transition-colors"
                    title="Копировать пароль"
                  >
                    {passwordCopied ? (
                      <svg
                        className="w-4 h-4 text-yellow-900"
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
                    ) : (
                      <svg
                        className="w-4 h-4 text-yellow-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
