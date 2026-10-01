import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminDeleteComment, adminHideComment, adminListComments } from "@/lib/queries";
import { isUuid, str } from "@/lib/validate";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const comments = await adminListComments();
  return NextResponse.json({ success: true, comments });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const action = str(body.action, 30);
    const commentId = str(body.commentId, 40);
    if (!isUuid(commentId)) {
      return NextResponse.json({ success: false, error: "commentId required" }, { status: 400 });
    }
    if (action === "hide") {
      await adminHideComment(commentId);
      return NextResponse.json({ success: true });
    }
    if (action === "delete") {
      await adminDeleteComment(commentId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("admin comments error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
