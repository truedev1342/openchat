import { NextResponse } from "next/server";

// temporary ping route endpoint
export async function GET() {
  return NextResponse.json({ ok: true });
}
