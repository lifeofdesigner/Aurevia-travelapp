import {NextResponse} from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "aurevia-travel",
    timestamp: new Date().toISOString()
  });
}
