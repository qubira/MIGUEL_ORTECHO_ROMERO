import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { requireAdminSession } from "@/lib/requireAdmin";

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const clientId = String(body.clientId || "");
  if (!clientId) {
    return NextResponse.json({ error: "Falta clientId" }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `documentos/${clientId}`;
  const type = "private";

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, type },
    process.env.CLOUDINARY_API_SECRET as string
  );

  return NextResponse.json({
    timestamp,
    folder,
    type,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
