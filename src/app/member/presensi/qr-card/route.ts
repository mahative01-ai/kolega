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
  const format = searchParams.get("format") ?? "html";

  if (!["html", "svg", "png"].includes(format)) {
    return new Response("Format QR Card tidak didukung.", { status: 400 });
  }

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
  <text x="76" y="82" fill="#ffffff" font-family="sans-serif" font-size="24" font-weight="700">${studio}</text>
  <text x="76" y="106" fill="#a1a1aa" font-family="sans-serif" font-size="12" font-weight="700" letter-spacing="1">DEFAULT STUDIO</text>
  <g transform="translate(54 150)">
    ${qrSvg.replace("<svg", '<svg x="0" y="0"')}
  </g>
  <text x="350" y="174" fill="#71717a" font-family="sans-serif" font-size="13" font-weight="700">NAMA</text>
  <text x="350" y="202" fill="#18181b" font-family="sans-serif" font-size="28" font-weight="700">${name}</text>
  <text x="350" y="235" fill="#71717a" font-family="sans-serif" font-size="13" font-weight="700">EMAIL</text>
  <text x="350" y="262" fill="#27272a" font-family="sans-serif" font-size="17">${email}</text>
  <text x="350" y="295" fill="#71717a" font-family="sans-serif" font-size="13" font-weight="700">QR UID</text>
  <text x="350" y="322" fill="#09090b" font-family="sans-serif" font-size="20" font-weight="700">${qrUid}</text>
  <text x="350" y="360" fill="#71717a" font-family="sans-serif" font-size="13">Aktif sejak ${escapeXml(issuedAt)}</text>
</svg>`;

  if (format === "html") {
    return new Response(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <title>QR Card - Kolega</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              min-height: 100vh;
              margin: 0;
              background-color: #f4f4f5;
              color: #18181b;
              font-family: Arial, Helvetica, sans-serif;
            }
            main {
              width: min(100%, 860px);
              margin: 0 auto;
              padding: 32px 18px;
            }
            .toolbar {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 20px;
            }
            .title {
              margin: 0;
              font-size: 24px;
              line-height: 1.2;
            }
            .description {
              margin: 6px 0 0;
              color: #71717a;
              font-size: 14px;
            }
            .actions {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 38px;
              border-radius: 10px;
              border: 1px solid #d4d4d8;
              background: #ffffff;
              color: #18181b;
              padding: 0 14px;
              font-size: 14px;
              font-weight: 700;
              text-decoration: none;
              cursor: pointer;
            }
            .button.primary {
              border-color: #18181b;
              background: #18181b;
              color: #ffffff;
            }
            .card-container {
              display: flex;
              justify-content: center;
              overflow: auto;
              padding: 16px;
              border: 1px solid #e4e4e7;
              border-radius: 28px;
              background: white;
              box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
            }
            .card-container svg {
              width: min(100%, 720px);
              height: auto;
              flex: 0 0 auto;
            }
            .hint {
              margin: 16px 0 0;
              color: #71717a;
              font-size: 13px;
              line-height: 1.5;
            }
            @media print {
              body {
                background: #ffffff;
              }
              main {
                padding: 0;
                width: 100%;
              }
              .toolbar,
              .hint {
                display: none;
              }
              .card-container {
                border: 0;
                box-shadow: none;
                border-radius: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <main>
            <div class="toolbar">
              <div>
                <h1 class="title">QR Card Kolega</h1>
                <p class="description">Preview kartu QR sebelum disimpan atau dicetak.</p>
              </div>
              <div class="actions">
                <button class="button primary" onclick="window.print()">Cetak / Simpan PDF</button>
                <a class="button" href="/member/presensi/qr-card?format=svg" download="kolega-qr-card.svg">Unduh SVG</a>
                <a class="button primary" href="/member/presensi/qr-card?format=png" download="kolega-qr-card.png">Unduh PNG</a>
              </div>
            </div>
            <div class="card-container">
              ${svg}
            </div>
            <p class="hint">
              Jika ingin menyimpan sebagai gambar, buka dari perangkat yang akan dipakai lalu gunakan fitur screenshot atau cetak sebagai PDF.
            </p>
          </main>
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
        "Content-Disposition": 'attachment; filename="kolega-qr-card.svg"',
        "Cache-Control": "private, no-store",
      }
    });
  }

  const imagePipeline = sharp(Buffer.from(svg));
  const image = await imagePipeline.png().toBuffer();

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'attachment; filename="kolega-qr-card.png"',
      "Cache-Control": "private, no-store",
    },
  });
}
