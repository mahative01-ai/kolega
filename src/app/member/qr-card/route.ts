import path from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GEIST_FONT_BASE64 } from "@/lib/fonts/geist-base64";

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
  const embed = searchParams.get("embed") === "1";

  if (!["html", "svg", "png", "jpeg"].includes(format)) {
    return new Response("QR Card format not supported.", { status: 400 });
  }

  // Set FONTCONFIG_PATH so Sharp / librsvg can locate fonts inside Next.js process
  process.env.FONTCONFIG_PATH = path.join(process.cwd(), "fonts");

  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const dashboardPath = currentUser.role === "ADMIN" ? "/admin" : "/member";
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
    return new Response("QR Card is not active.", { status: 404 });
  }

  const qrSvg = await QRCode.toString(credential.qrUid, {
    type: "svg",
    margin: 1,
    width: 260,
    errorCorrectionLevel: "M",
  });
  const issuedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(credential.issuedAt);
  const name = escapeXml(currentUser.name);
  const email = escapeXml(currentUser.email);
  const studio = escapeXml(currentUser.defaultStudio?.name ?? "No studio assigned");
  const qrUid = escapeXml(credential.qrUid);

  const fontStyleDef = `<defs>
    <style type="text/css">
      @font-face {
        font-family: 'GeistFont';
        src: url('data:font/ttf;charset=utf-8;base64,${GEIST_FONT_BASE64}');
        font-weight: normal;
        font-style: normal;
      }
      text {
        font-family: 'GeistFont', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      }
    </style>
  </defs>`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="460" viewBox="0 0 720 460">
  ${fontStyleDef}
  <rect width="720" height="460" rx="28" fill="#ffffff"/>
  <rect x="24" y="24" width="672" height="412" rx="24" fill="#f8fafc" stroke="#d4d4d8"/>
  <rect x="48" y="48" width="624" height="76" rx="18" fill="#09090b"/>
  <text x="76" y="86" fill="#ffffff" font-size="24" font-weight="700" dominant-baseline="middle">${studio}</text>
  <g transform="translate(54 150)">
    ${qrSvg.replace("<svg", '<svg x="0" y="0"')}
  </g>
  <text x="350" y="174" fill="#71717a" font-size="13" font-weight="700">NAME</text>
  <text x="350" y="202" fill="#18181b" font-size="28" font-weight="700">${name}</text>
  <text x="350" y="235" fill="#71717a" font-size="13" font-weight="700">EMAIL</text>
  <text x="350" y="262" fill="#27272a" font-size="17">${email}</text>
  <text x="350" y="295" fill="#71717a" font-size="13" font-weight="700">QR UID</text>
  <text x="350" y="322" fill="#09090b" font-size="20" font-weight="700">${qrUid}</text>
  <text x="350" y="360" fill="#71717a" font-size="13">Active since ${escapeXml(issuedAt)}</text>
</svg>`;

  if (format === "html") {
    if (embed) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>QR Card Preview</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              * { box-sizing: border-box; }
              html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: transparent;
                overflow: hidden;
                font-family: Arial, Helvetica, sans-serif;
              }
              .card-container {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .card-container svg {
                width: 100%;
                height: auto;
                max-width: 720px;
                max-height: 460px;
                display: block;
                filter: drop-shadow(0 8px 18px rgba(15, 23, 42, 0.08));
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
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Kolega QR Card</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              color: #0f172a;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            main {
              width: min(100%, 800px);
              padding: 40px 24px;
              margin: 0 auto;
            }
            .toolbar {
              display: flex;
              flex-direction: column;
              gap: 16px;
              margin-bottom: 28px;
            }
            @media (min-width: 640px) {
              .toolbar {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
              }
            }
            .title {
              margin: 0;
              font-size: 28px;
              font-weight: 800;
              letter-spacing: -0.5px;
              color: #09090b;
            }
            .description {
              margin: 6px 0 0;
              color: #64748b;
              font-size: 14px;
              font-weight: 400;
            }
            .actions {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }
            .button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 40px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              background: #ffffff;
              color: #334155;
              padding: 0 16px;
              font-size: 13px;
              font-weight: 600;
              text-decoration: none;
              cursor: pointer;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            }
            .button:hover {
              background: #f8fafc;
              border-color: #cbd5e1;
              color: #0f172a;
              transform: translateY(-1px);
            }
            .button.primary {
              border-color: #09090b;
              background: #09090b;
              color: #ffffff;
              box-shadow: 0 4px 12px rgba(9, 9, 11, 0.15);
            }
            .button.primary:hover {
              background: #27272a;
              border-color: #27272a;
              color: #ffffff;
              box-shadow: 0 6px 16px rgba(9, 9, 11, 0.25);
            }
            .button.secondary {
              background: transparent;
              border: 1px solid transparent;
              box-shadow: none;
              color: #64748b;
            }
            .button.secondary:hover {
              background: #e2e8f0;
              color: #0f172a;
            }
            .card-container {
              display: flex;
              justify-content: center;
              overflow: hidden;
              padding: 24px;
              border: 1px solid rgba(226, 232, 240, 0.8);
              border-radius: 32px;
              background: rgba(255, 255, 255, 0.8);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08), 
                          0 0 0 1px rgba(255, 255, 255, 0.6) inset;
              transition: all 0.3s ease;
            }
            .card-container:hover {
              transform: scale(1.01);
              box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.12);
            }
            .card-container svg {
              width: 100%;
              height: auto;
              max-width: 720px;
              display: block;
              filter: drop-shadow(0 10px 20px rgba(15, 23, 42, 0.04));
            }
            .hint-box {
              margin-top: 24px;
              padding: 16px 20px;
              border-radius: 16px;
              background: #ffffff;
              border: 1px solid #f1f5f9;
              display: flex;
              align-items: flex-start;
              gap: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
            }
            .hint-icon {
              font-size: 18px;
              line-height: 1;
              margin-top: 1px;
            }
            .hint {
              margin: 0;
              color: #64748b;
              font-size: 13px;
              line-height: 1.6;
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
              .hint-box {
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
                <h1 class="title">Kolega QR Card</h1>
                <p class="description">Preview your QR Card before saving or printing.</p>
              </div>
              <div class="actions">
                <a class="button secondary" href="${dashboardPath}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  Back
                </a>
                <button class="button" onclick="window.print()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Print / PDF
                </button>
                <a class="button" href="/member/qr-card?format=svg" download="kolega-qr-card.svg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  SVG
                </a>
                <button class="button primary" onclick="downloadPngClient()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  PNG
                </button>
              </div>
            </div>
            <div class="card-container">
              ${svg}
            </div>
            <div class="hint-box">
              <span class="hint-icon">💡</span>
              <p class="hint">
                To save this card as an image, open this page on the device you intend to use and take a screenshot, or click <b>PNG</b> / <b>SVG</b>.
              </p>
            </div>
          </main>

          <script>
            function downloadPngClient() {
              const svgEl = document.querySelector('.card-container svg');
              if (!svgEl) {
                window.location.href = '/member/qr-card?format=png';
                return;
              }
              const xml = new XMLSerializer().serializeToString(svgEl);
              const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(svgBlob);
              const img = new Image();
              img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = 1440;
                canvas.height = 920;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.scale(2, 2);
                  ctx.drawImage(img, 0, 0);
                  const a = document.createElement('a');
                  a.download = 'kolega-qr-card.png';
                  a.href = canvas.toDataURL('image/png');
                  a.click();
                } else {
                  window.location.href = '/member/qr-card?format=png';
                }
                URL.revokeObjectURL(url);
              };
              img.onerror = function () {
                window.location.href = '/member/qr-card?format=png';
              };
              img.src = url;
            }
          </script>
        </body>
      </html>
    `, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
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

  if (format === "jpeg") {
    const imagePipeline = sharp(Buffer.from(svg));
    const image = await imagePipeline.jpeg().toBuffer();

    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'attachment; filename="kolega-qr-card.jpg"',
        "Cache-Control": "private, no-store",
      },
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
