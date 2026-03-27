import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Verify the user is authenticated via NextAuth (reading the secure HTTP-only cookie)
  const session = await getServerSession(authOptions);
  const { id } = await params;
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify they actually have the "admin" role before we do anything
  if (session.user.role !== "admin") {
    console.warn(`[Security] User ${session.user.email} attempted to toggle widget ${id} without admin privileges.`);
    return NextResponse.json({ error: "Forbidden: Admins Only" }, { status: 403 });
  }

  // 3. They are verified! Now the Next.js server acts as a BFF/Proxy to the Go Backend.
  // We grab the highly secure API Key that ONLY lives on the Node.js server.
  const backendApiUrl = process.env.INTERNAL_BACKEND_URL || "http://backend:8080";
  const psk = process.env.ADMIN_API_KEY;

  if (!psk) {
    console.error("[Config Error] ADMIN_API_KEY is not set on the Next.js server.");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  try {
    // 4. Forward the request to the internal Go API network, attaching the secret PSK header
    const response = await fetch(`${backendApiUrl}/admin/widgets/${id}/toggle`, {
      method: "POST",
      headers: {
        "X-Admin-Token": psk,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: "Backend failed to toggle widget", details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Proxy Error] Failed to reach Golang backend:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
