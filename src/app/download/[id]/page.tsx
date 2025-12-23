"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function DownloadPage() {
  const params = useParams();
  const id = params.id as string;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{
    filename: string;
    size: string;
    isProtected: boolean;
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
          setError("Файл не найден или срок действия истек");
          setLoading(false);
          return;
        }
        if (!response.ok) {
          setError("Не удалось загрузить информацию о файле");
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
        setError("Не удалось загрузить информацию о файле");
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
            Скачать файл
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
            Скачать файл
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Этот файл защищен паролем.
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
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">Скачать файл</h1>

        {fileData && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm sm:text-base font-medium text-gray-700">
                Имя файла
              </label>
              <p className="mt-2 text-sm sm:text-base text-gray-900 break-all bg-gray-50 p-3 rounded-xl">
                {fileData.filename}
              </p>
            </div>

            <div>
              <label className="text-sm sm:text-base font-medium text-gray-700">
                Размер файла
              </label>
              <p className="mt-2 text-sm sm:text-base text-gray-900 bg-gray-50 p-3 rounded-xl">
                {fileData.size} МБ
              </p>
            </div>
          </div>
        )}

        <button
          onClick={async () => {
            try {
              const response = await fetch(`/api/download/${id}`, {
                method: fileData?.isProtected ? "POST" : "GET",
                headers: fileData?.isProtected
                  ? {
                      "Content-Type": "application/json",
                    }
                  : {},
                body: fileData?.isProtected
                  ? JSON.stringify({ password })
                  : undefined,
              });

              if (!response.ok) {
                if (response.status === 403) {
                  setError("Требуется пароль или пароль неверен");
                  setPasswordVerified(false);
                } else {
                  setError(
                    "Не удалось скачать файл. Пожалуйста, попробуйте снова. Если проблема сохраняется, пожалуйста, свяжитесь с поддержкой."
                  );
                }
                return;
              }

              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              const sanitizedFilename = (fileData?.filename || "download")
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .substring(0, 255);
              a.download = sanitizedFilename;
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
          }}
          className="w-full bg-blue-500 text-white py-4 px-6 rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors font-medium text-base shadow-md hover:shadow-lg"
        >
          Скачать файл
        </button>
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm sm:text-base text-red-800 break-words">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
