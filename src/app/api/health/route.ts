import { NextResponse } from "next/server";

// temporary health route endpoint
export async function GET() {
  return NextResponse.json({ ok: true });
}
