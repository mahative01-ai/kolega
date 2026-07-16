import path from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  // Set FONTCONFIG_PATH so Sharp can locate fonts inside Next.js process (only on non-Windows)
  if (process.platform !== "win32") {
    process.env.FONTCONFIG_PATH = path.join(process.cwd(), "fonts");
  }

  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const credential = await prisma.qrCredential.findFirst({
    where: {
      userId: currentUser.id,
      status: "ACTIVE",
    },
    orderBy: {
      issuedAt: "desc",
    },
    select: {
      qrUid: true,
      issuedAt: true,
    },
  });

  if (!credential) {
    return new Response("QR Card belum aktif.", { status: 404 });
  }

  const qrSvg = await QRCode.toString(credential.qrUid, {
    type: "svg",
    margin: 1,
    width: 260,
    errorCorrectionLevel: "M",
  });
  const issuedAt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(credential.issuedAt);
  const name = escapeXml(currentUser.name);
  const email = escapeXml(currentUser.email);
  const studio = escapeXml(currentUser.defaultStudio?.name ?? "Belum ada studio");
  const qrUid = escapeXml(credential.qrUid);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="460" viewBox="0 0 720 460">
  <rect width="720" height="460" rx="28" fill="#ffffff"/>
  <rect x="24" y="24" width="672" height="412" rx="24" fill="#f8fafc" stroke="#d4d4d8"/>
  <rect x="48" y="48" width="624" height="76" rx="18" fill="#09090b"/>
  <text x="76" y="82" fill="#ffffff" font-family="sans-serif" font-size="24" font-weight="700">Kolega QR Card</text>
  <text x="76" y="106" fill="#d4d4d8" font-family="sans-serif" font-size="14">Kartu presensi WFO personal</text>
  <g transform="translate(54 150)">
    ${qrSvg.replace("<svg", '<svg x="0" y="0"')}
  </g>
  <text x="350" y="174" fill="#71717a" font-family="sans-serif" font-size="13" font-weight="700">NAMA</text>
  <text x="350" y="202" fill="#18181b" font-family="sans-serif" font-size="28" font-weight="700">${name}</text>
  <text x="350" y="235" fill="#71717a" font-family="sans-serif" font-size="13" font-weight="700">EMAIL</text>
  <text x="350" y="260" fill="#27272a" font-family="sans-serif" font-size="17">${email}</text>
  <text x="350" y="294" fill="#71717a" font-family="sans-serif" font-size="13" font-weight="700">DEFAULT STUDIO</text>
  <text x="350" y="320" fill="#27272a" font-family="sans-serif" font-size="18">${studio}</text>
  <text x="350" y="354" fill="#71717a" font-family="sans-serif" font-size="13" font-weight="700">QR UID</text>
  <text x="350" y="381" fill="#09090b" font-family="sans-serif" font-size="20" font-weight="700">${qrUid}</text>
  <text x="350" y="410" fill="#71717a" font-family="sans-serif" font-size="13">Aktif sejak ${escapeXml(issuedAt)}</text>
</svg>`;

  if (format === "html") {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Debug QR Card - Kolega</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background-color: #f1f5f9;
              margin: 0;
              font-family: sans-serif;
            }
            .card-container {
              box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
              border-radius: 28px;
              overflow: hidden;
              background: white;
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            ${svg}
          </div>
        </body>
      </html>
    `, {
      headers: {
        "Content-Type": "text/html",
      }
    });
  }

  if (format === "svg") {
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
      }
    });
  }

  const imagePipeline = sharp(Buffer.from(svg)).flatten({
    background: "#ffffff",
  });
  const image = await imagePipeline.jpeg({ quality: 92 }).toBuffer();

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": 'attachment; filename="kolega-qr-card.jpg"',
      "Cache-Control": "private, no-store",
    },
  });
}
