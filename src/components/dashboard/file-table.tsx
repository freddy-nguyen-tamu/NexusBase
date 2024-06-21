import { Download, Eye, FileText, MoreHorizontal, Share2 } from "lucide-react";

import { files } from "@/lib/sample-data";

const permissionStyles: Record<string, string> = {
  Owner: "bg-emerald-50 text-emerald-700",
  Editor: "bg-blue-50 text-blue-700",
  Viewer: "bg-slate-100 text-slate-600",
};

export function FileTable() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Cloud Files</h2>
          <p className="text-sm text-slate-500">AWS S3 metadata, sharing, and previews.</p>
        </div>
        <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="py-3 pr-4 font-semibold">File</th>
              <th className="px-4 py-3 font-semibold">Project</th>
              <th className="px-4 py-3 font-semibold">Access</th>
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="py-3 pl-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.map((file) => (
              <tr key={file.name} className="text-slate-700">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-[#0f766e]">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">{file.name}</p>
                      <p className="text-xs text-slate-500">{file.type} · {file.owner}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{file.project}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${permissionStyles[file.permission]}`}>
                    {file.permission}
                  </span>
                </td>
                <td className="px-4 py-3">{file.size}</td>
                <td className="px-4 py-3">{file.updated}</td>
                <td className="py-3 pl-4">
                  <div className="flex justify-end gap-1">
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="Preview">
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="Download">
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="More file actions">
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
