import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDeleteComment, adminDismissReport, adminHideComment, adminListReports } from "@/lib/queries";
import { isUuid, str } from "@/lib/validate";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const reports = await adminListReports();
  return NextResponse.json({ success: true, reports });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const action = str(body.action, 30);
    const reportId = body.reportId ? str(body.reportId, 40) : null;
    const commentId = body.commentId ? str(body.commentId, 40) : null;

    if (action === "dismiss") {
      if (!isUuid(reportId)) {
        return NextResponse.json({ success: false, error: "reportId required" }, { status: 400 });
      }
      await adminDismissReport(reportId);
      return NextResponse.json({ success: true });
    }
    if (action === "hideComment") {
      if (!isUuid(commentId)) {
        return NextResponse.json({ success: false, error: "commentId required" }, { status: 400 });
      }
      await adminHideComment(commentId);
      return NextResponse.json({ success: true });
    }
    if (action === "deleteComment") {
      if (!isUuid(commentId)) {
        return NextResponse.json({ success: false, error: "commentId required" }, { status: 400 });
      }
      await adminDeleteComment(commentId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("admin reports error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
