"use client";

import { useState } from "react";

const EXPIRATION_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 72, label: "3 days" },
  { value: 168, label: "7 days" },
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setDownloadUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file");
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
            "Upload failed. Please try again. If the problem persists, please contact support."
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
          : "Upload failed. Please try again. If the problem persists, please contact support."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">File Sharing</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="file"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select File
            </label>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={uploading}
            />
          </div>

          <div>
            <label
              htmlFor="expiration"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Link Expires In
            </label>
            <select
              id="expiration"
              value={expirationHours}
              onChange={(e) => setExpirationHours(Number(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={uploading}
            />
            <label
              htmlFor="passwordProtected"
              className="ml-2 block text-sm text-gray-700"
            >
              Protect with password
            </label>
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {downloadUrl && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm font-medium text-green-800 mb-2">
              Upload successful!
            </p>
            {uploadedExpirationHours && (
              <p className="text-sm text-green-700 mb-2">
                Link expires in{" "}
                {EXPIRATION_OPTIONS.find(
                  (opt) => opt.value === uploadedExpirationHours
                )?.label || `${uploadedExpirationHours} hours`}
              </p>
            )}
            <p className="text-sm text-green-700 mb-2">Download link:</p>
            <a
              href={downloadUrl}
              className="text-sm text-blue-600 hover:text-blue-800 break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {downloadUrl}
            </a>
            {password && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Password (save this, cannot be recovered):
                </p>
                <p className="text-sm font-mono text-yellow-900 break-all">
                  {password}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
