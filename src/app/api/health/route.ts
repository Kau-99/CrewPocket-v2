import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "crewpocket",
    time: new Date().toISOString(),
  });
}
