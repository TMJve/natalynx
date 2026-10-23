"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/app/admin/actions";
import { FormStatus } from "@/components/action-form";

const MAX_BYTES = 50 * 1024 * 1024;
export const IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif";

// Uploads the chosen file straight to Supabase Storage (checked by the storage policies:
// admins only), then calls the server action with the stored path to save the database row.
export function UploadForm({
  action,
  projectId,
  folder,
  accept,
  fileRequired = false,
  fileLabel = "Image (optional)",
  submitLabel,
  children,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  projectId: string;
  folder: "updates" | "approvals" | "deliverables";
  accept?: string;
  fileRequired?: boolean;
  fileLabel?: string;
  submitLabel: string;
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const file = fd.get("file");
        fd.delete("file");
        startTransition(async () => {
          setResult(null);
          const supabase = createClient();
          let path: string | null = null;

          if (file instanceof File && file.size > 0) {
            if (file.size > MAX_BYTES) return setResult({ error: "Files can be up to 50 MB." });
            if (accept && !accept.split(",").includes(file.type)) {
              return setResult({ error: "That file type isn't supported here." });
            }
            path = `${projectId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
            const { error } = await supabase.storage
              .from("project-files")
              .upload(path, file, { contentType: file.type || undefined, upsert: false });
            if (error) return setResult({ error: `Upload failed: ${error.message}` });
            fd.set("storage_path", path);
            fd.set("size_bytes", String(file.size));
            fd.set("mime_type", file.type);
          } else if (fileRequired) {
            return setResult({ error: "Choose a file to upload." });
          }

          const res = await action(fd);
          setResult(res);
          if (res.error && path) await supabase.storage.from("project-files").remove([path]);
          if (res.ok) formRef.current?.reset();
        });
      }}
    >
      <input type="hidden" name="project_id" value={projectId} />
      {children}
      <div>
        <label className="label" htmlFor={`file-${folder}`}>
          {fileLabel}
        </label>
        <input
          id={`file-${folder}`}
          name="file"
          type="file"
          accept={accept}
          required={fileRequired}
          className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-canvas file:px-4 file:py-2 file:text-sm file:text-ink hover:file:bg-line"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Uploading…" : submitLabel}
        </button>
        <FormStatus result={result} />
      </div>
    </form>
  );
}

function safeName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+/, "");
  return cleaned.slice(-80) || "file";
}
