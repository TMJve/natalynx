import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Looks the file up as the signed-in user (RLS applies), then hands back a download link that
// expires in 60 seconds. Works for the admin too, since admins can read every file.
export async function GET(request: NextRequest, ctx: RouteContext<"/portal/[projectId]/files/[fileId]">) {
  const { projectId, fileId } = await ctx.params;
  const supabase = await createClient();

  const { data: file } = await supabase
    .from("files")
    .select("storage_path, label")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!file) return new NextResponse("Not found", { status: 404 });

  const filename = downloadName(file.label, file.storage_path);
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(file.storage_path, 60, { download: filename });
  if (error || !data) return new NextResponse("Not found", { status: 404 });

  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}

function downloadName(label: string, path: string) {
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
  const base = label.replace(/[^\w\s.-]/g, "").trim() || "download";
  return base.toLowerCase().endsWith(ext.toLowerCase()) ? base : `${base}${ext}`;
}
