import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
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
    const response = await fetch(`${backendApiUrl}/admin/resume/requests`, {
      headers: {
        "X-Admin-Token": psk,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Backend failed to fetch requests" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Proxy Error] Failed to reach Golang backend resume requests endpoint:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
