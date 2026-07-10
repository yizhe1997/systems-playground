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
    const body = await req.json();
    const response = await fetch(`${backendApiUrl}/admin/resume/requests/${body.id}/action`, {
      method: "POST",
      headers: {
        "X-Admin-Token": psk,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: body.action, subject: body.subject, body: body.body }),
    });

    if (!response.ok) {
      let errorMsg = "Backend failed to process action";
      try {
        const errData = await response.json();
        if (errData.error) errorMsg = errData.error;
      } catch (e) {}
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Proxy Error] Failed to reach Golang backend resume action endpoint:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
