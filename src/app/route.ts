import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";

// "/" just decides where you belong.
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  const path = !viewer ? "/login" : viewer.isAdmin ? "/admin" : "/portal";
  return NextResponse.redirect(new URL(path, request.url));
}
