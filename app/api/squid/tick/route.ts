import { NextResponse } from "next/server";
import { runSquidTick, runSkyRounds } from "@/lib/squid-queries";

export const dynamic = "force-dynamic";

// force=true の連打でDBに負荷をかけられないよう、強制再計算は1分に1回まで
let lastForce = 0;

async function handle(request: Request) {
  try {
    const secret = process.env.SQUID_TICK_SECRET;
    if (secret) {
      const url = new URL(request.url);
      const got = request.headers.get("x-squid-tick") ?? url.searchParams.get("key");
      if (got !== secret) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }
    const now = new Date();
    const url = new URL(request.url);
    let force = url.searchParams.get("force") === "1";
    if (force && Date.now() - lastForce < 60_000) force = false;
    if (force) lastForce = Date.now();
    const tick = await runSquidTick(now, force);
    await runSkyRounds(now);
    return NextResponse.json({ success: true, tick });
  } catch (e) {
    console.error("squid tick error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
