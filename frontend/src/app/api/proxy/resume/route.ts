import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "admin";

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

    // Redact PII (Name and Email) for non-admins to showcase the UI securely
    if (!isAdmin && Array.isArray(data)) {
      const redactedData = data.map((req: any) => {
        // e.g., john.doe@gmail.com -> j***@g***.com
        let redactedEmail = "***@***.***";
        if (req.email && req.email.includes("@")) {
          const [user, domain] = req.email.split("@");
          const domainParts = domain.split(".");
          redactedEmail = `${user.charAt(0)}***@${domainParts[0].charAt(0)}***.${domainParts[1]}`;
        }
        
        // e.g., John Doe -> J*** D***
        let redactedName = "*** ***";
        if (req.name) {
          redactedName = req.name.split(" ").map((n: string) => n.charAt(0) + "***").join(" ");
        }

        return {
          ...req,
          name: redactedName,
          email: redactedEmail,
          reason: req.reason ? "**********************" : ""
        };
      });
      return NextResponse.json(redactedData);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Proxy Error] Failed to reach Golang backend resume requests endpoint:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
