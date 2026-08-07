import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function backendAndKey() {
  return {
    backendApiUrl: process.env.INTERNAL_BACKEND_URL || "http://backend:8080",
    psk: process.env.ADMIN_API_KEY,
  };
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admins Only" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { backendApiUrl, psk } = backendAndKey();
  if (!psk) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  try {
    const response = await fetch(`${backendApiUrl}/admin/resume-files`, {
      headers: { "X-Admin-Token": psk },
      cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json({ error: body?.error || "Failed to list resume files" }, { status: response.status });
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error("[Proxy Error] Failed to reach Golang backend resume-files endpoint:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { backendApiUrl, psk } = backendAndKey();
  if (!psk) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  try {
    const incoming = await req.formData();
    const file = incoming.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const forwardForm = new FormData();
    forwardForm.append("file", file, file instanceof File ? file.name : "upload");

    const response = await fetch(`${backendApiUrl}/admin/resume-files`, {
      method: "POST",
      headers: { "X-Admin-Token": psk },
      body: forwardForm,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json({ error: body?.error || "Failed to upload file" }, { status: response.status });
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error("[Proxy Error] Failed to reach Golang backend resume-files endpoint:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { backendApiUrl, psk } = backendAndKey();
  if (!psk) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  try {
    const response = await fetch(`${backendApiUrl}/admin/resume-files/${encodeURIComponent(filename)}`, {
      method: "DELETE",
      headers: { "X-Admin-Token": psk },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json({ error: body?.error || "Failed to delete file" }, { status: response.status });
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error("[Proxy Error] Failed to reach Golang backend resume-files endpoint:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
