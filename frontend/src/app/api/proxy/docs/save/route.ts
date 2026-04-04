import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admins Only" }, { status: 403 });
  }

  const backendApiUrl = process.env.INTERNAL_BACKEND_URL || "http://backend:8080";
  const psk = process.env.ADMIN_API_KEY;

  if (!psk) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  try {
    const { path, content } = await req.json();
    const safePath = path.startsWith("/") ? path : `/${path}`;
    
    const response = await fetch(`${backendApiUrl}/admin/docs/save${safePath}`, {
      method: "POST",
      headers: {
        "X-Admin-Token": psk,
        "Content-Type": "text/markdown",
      },
      body: content, // send raw string
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Backend failed to save document" }, { status: response.status });
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[Proxy Error] Failed to reach Golang backend file save endpoint:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
