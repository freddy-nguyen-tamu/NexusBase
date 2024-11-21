"use client";

import {
  AlertCircle,
  Download,
  Edit3,
  Eye,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  slug: string;
};

type ApiFile = {
  id: string;
  name: string;
  key: string;
  bucket: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  uploaderId: string;
  project: Project;
  uploader: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

const mimeIconMap = [
  {
    test: (mime: string) => mime.startsWith("image/"),
    icon: FileImage,
  },
  {
    test: (mime: string) =>
      mime.includes("zip") ||
      mime.includes("rar") ||
      mime.includes("tar") ||
      mime.includes("gzip"),
    icon: FileArchive,
  },
  {
    test: (mime: string) =>
      mime.includes("json") ||
      mime.includes("javascript") ||
      mime.includes("typescript") ||
      mime.includes("html") ||
      mime.includes("css"),
    icon: FileCode2,
  },
];

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getFileIcon(mimeType: string) {
  return mimeIconMap.find((item) => item.test(mimeType))?.icon ?? FileText;
}

function getUploaderName(file: ApiFile) {
  return file.uploader.name ?? file.uploader.email ?? "Unknown user";
}

export function FileTable() {
  const [files, setFiles] = useState<ApiFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  async function loadProjects() {
    setIsLoadingProjects(true);

    try {
      const response = await fetch("/api/projects", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        setProjects([]);
        setSelectedProjectId("");
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load projects.");
      }

      const data = (await response.json()) as { projects: Project[] };

      setProjects(data.projects);
      setSelectedProjectId((current) => current || data.projects[0]?.id || "");
    } catch {
      setProjects([]);
      setSelectedProjectId("");
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadFiles(projectId = selectedProjectId) {
    setIsLoading(true);
    setError(null);

    try {
      const url = projectId ? `/api/files?projectId=${projectId}` : "/api/files";

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        setFiles([]);
        setError("Sign in to load workspace files.");
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load files.");
      }

      const data = (await response.json()) as { files: ApiFile[] };

      setFiles(data.files);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load files.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    void loadFiles(selectedProjectId);
  }, [selectedProjectId]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  async function uploadToSignedUrl(file: File, uploadUrl: string) {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error("S3 upload failed.");
    }
  }

  async function createFileRecord({
    file,
    key,
    bucket,
  }: {
    file: File;
    key: string;
    bucket: string;
  }) {
    const response = await fetch("/api/files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: selectedProjectId,
        name: file.name,
        key,
        bucket,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      throw new Error(data?.error ?? "Could not save file metadata.");
    }

    return response.json() as Promise<{ file: ApiFile }>;
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProjectId) {
      setError("Create or select a project before uploading a file.");
      return;
    }

    if (!selectedFile) {
      setError("Choose a file before uploading.");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Preparing signed upload URL...");
    setError(null);

    try {
      const presignResponse = await fetch("/api/files/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          fileName: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
        }),
      });

      if (!presignResponse.ok) {
        const data = (await presignResponse.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not create signed upload URL.");
      }

      const presignData = (await presignResponse.json()) as {
        bucket: string;
        key: string;
        method: "PUT";
        uploadUrl: string;
        expiresInSeconds: number;
      };

      setUploadProgress("Uploading file to S3...");
      await uploadToSignedUrl(selectedFile, presignData.uploadUrl);

      setUploadProgress("Saving file metadata...");
      const data = await createFileRecord({
        file: selectedFile,
        key: presignData.key,
        bucket: presignData.bucket,
      });

      setFiles((current) => [data.file, ...current]);
      setSelectedFile(null);
      setUploadProgress("");

      const input = document.getElementById("workspace-file") as
        | HTMLInputElement
        | null;
      if (input) {
        input.value = "";
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload file.",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  }

  async function downloadFile(fileId: string) {
    setBusyFileId(fileId);
    setError(null);

    try {
      const response = await fetch(`/api/files?fileId=${fileId}&action=download`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not create download link.");
      }

      const data = (await response.json()) as {
        downloadUrl: string;
      };

      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not download file.",
      );
    } finally {
      setBusyFileId(null);
    }
  }

  function startEditing(file: ApiFile) {
    setEditingFileId(file.id);
    setEditingName(file.name);
  }

  function cancelEditing() {
    setEditingFileId(null);
    setEditingName("");
  }

  async function renameFile(fileId: string) {
    const trimmedName = editingName.trim();

    if (!trimmedName) {
      setError("File name is required.");
      return;
    }

    setBusyFileId(fileId);
    setError(null);

    try {
      const response = await fetch("/api/files", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          name: trimmedName,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not rename file.");
      }

      const data = (await response.json()) as { file: ApiFile };

      setFiles((current) =>
        current.map((file) => (file.id === fileId ? data.file : file)),
      );

      cancelEditing();
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : "Could not rename file.",
      );
    } finally {
      setBusyFileId(null);
    }
  }

  async function deleteFile(fileId: string) {
    const file = files.find((item) => item.id === fileId);

    if (!file) {
      return;
    }

    const confirmed = window.confirm(`Delete "${file.name}"?`);

    if (!confirmed) {
      return;
    }

    setBusyFileId(fileId);
    setError(null);

    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(data?.error ?? "Could not delete file.");
      }

      setFiles((current) => current.filter((item) => item.id !== fileId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete file.",
      );
    } finally {
      setBusyFileId(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-[#2563eb]" />
            <h2 className="text-lg font-semibold text-slate-950">
              Workspace files
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Upload files to S3, save metadata, and generate secure download
            links.
          </p>
        </div>

        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={() => void loadFiles()}
          type="button"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      <form
        className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[220px_1fr_auto]"
        onSubmit={uploadFile}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project
          </span>
          <select
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            disabled={isLoadingProjects || isUploading}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            value={selectedProjectId}
          >
            {isLoadingProjects ? <option>Loading projects...</option> : null}
            {!isLoadingProjects && projects.length === 0 ? (
              <option value="">No projects found</option>
            ) : null}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            File
          </span>
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            disabled={!selectedProjectId || isUploading}
            id="workspace-file"
            onChange={onFileChange}
            type="file"
          />
        </label>

        <div className="flex items-end">
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#10151f] px-4 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            disabled={!selectedFile || !selectedProjectId || isUploading}
            type="submit"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Upload
          </button>
        </div>

        {selectedFile ? (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 lg:col-span-3">
            Selected:{" "}
            <span className="font-semibold text-slate-900">
              {selectedFile.name}
            </span>{" "}
            · {formatBytes(selectedFile.size)}
          </div>
        ) : null}

        {uploadProgress ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 lg:col-span-3">
            {uploadProgress}
          </div>
        ) : null}
      </form>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {selectedProject ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          Showing files for{" "}
          <span className="font-semibold text-slate-800">
            {selectedProject.name}
          </span>
          .
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Uploader</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              <tr>
                <td
                  className="px-4 py-10 text-center text-sm text-slate-500"
                  colSpan={6}
                >
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading files...
                </td>
              </tr>
            ) : null}

            {!isLoading && files.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-10 text-center text-sm text-slate-500"
                  colSpan={6}
                >
                  No files uploaded yet.
                </td>
              </tr>
            ) : null}

            {files.map((file) => {
              const Icon = getFileIcon(file.mimeType);
              const isEditing = editingFileId === file.id;
              const isBusy = busyFileId === file.id;

              return (
                <tr key={file.id} className="bg-white">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        {isEditing ? (
                          <input
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                            value={editingName}
                          />
                        ) : (
                          <p className="truncate font-semibold text-slate-950">
                            {file.name}
                          </p>
                        )}

                        <p className="truncate text-xs text-slate-500">
                          {file.mimeType}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {file.project.name}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {getUploaderName(file)}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {formatBytes(file.size)}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(file.updatedAt)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            disabled={isBusy}
                            onClick={() => void renameFile(file.id)}
                            title="Save name"
                            type="button"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                            onClick={cancelEditing}
                            title="Cancel rename"
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                            disabled={isBusy}
                            onClick={() => void downloadFile(file.id)}
                            title="Preview"
                            type="button"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                            disabled={isBusy}
                            onClick={() => void downloadFile(file.id)}
                            title="Download"
                            type="button"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                            onClick={() => startEditing(file)}
                            title="Rename"
                            type="button"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            className={cn(
                              "grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50",
                              isBusy && "cursor-not-allowed opacity-60",
                            )}
                            disabled={isBusy}
                            onClick={() => void deleteFile(file.id)}
                            title="Delete"
                            type="button"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                            title="More file actions"
                            type="button"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
