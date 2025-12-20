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
          setError("File not found or has expired");
          setLoading(false);
          return;
        }
        if (!response.ok) {
          setError("Failed to load file information");
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
        setError("Failed to load file information");
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
        setError("Incorrect password");
        return;
      }

      const data = await response.json();
      setFileData(data);
      setPasswordVerified(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to verify password. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !fileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">
            File Download
          </h1>
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (fileData?.isProtected && !passwordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">
            File Download
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            This file is password protected.
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Verify Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">File Download</h1>

        {fileData && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700">
                File Name
              </label>
              <p className="mt-1 text-gray-900 break-all">
                {fileData.filename}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                File Size
              </label>
              <p className="mt-1 text-gray-900">{fileData.size} MB</p>
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
                  setError("Password required or invalid");
                  setPasswordVerified(false);
                } else {
                  setError(
                    "Failed to download file. Please try again. If the problem persists, please contact support."
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
                  : "Failed to download file. Please try again."
              );
            }
          }}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Download File
        </button>
      </div>
    </div>
  );
}
