import { prisma } from "@/lib/prisma";
import { getPlatformResultMatrix } from "@/lib/result.service";
import { notFound } from "next/navigation";

type RouteContext = { params: Promise<{ id: string }> };

const BADGE_STYLE: Record<string, string> = {
  PASS:    "background:#dcfce7;color:#166534",
  FAIL:    "background:#fee2e2;color:#991b1b",
  PARTIAL: "background:#fef3c7;color:#92400e",
  "N/A":   "background:#f3f4f6;color:#4b5563",
};

function badge(status: string | null | undefined): string {
  if (!status) return '<span style="color:#9ca3af">—</span>';
  const style = BADGE_STYLE[status] ?? "background:#f3f4f6;color:#555";
  return `<span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:3px;font-size:8pt;font-weight:700;letter-spacing:0.04em;${style}">${status}</span>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;

  const [platform, matrix] = await Promise.all([
    prisma.platform.findUnique({ where: { id } }),
    getPlatformResultMatrix(id),
  ]);

  if (!platform) return new Response("Not found", { status: 404 });

  const passCount    = matrix.filter((m) => m.result?.status === "PASS").length;
  const failCount    = matrix.filter((m) => m.result?.status === "FAIL").length;
  const partialCount = matrix.filter((m) => m.result?.status === "PARTIAL").length;
  const naCount      = matrix.filter((m) => m.result?.status === "N/A").length;
  const recorded     = matrix.filter((m) => m.result !== null).length;
  const pct          = matrix.length > 0 ? Math.round((passCount / matrix.length) * 100) : 0;

  const generatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const grouped = matrix.reduce<Record<string, typeof matrix>>((acc, item) => {
    const cat = item.testCase.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  let rows = "";
  for (const [category, items] of Object.entries(grouped)) {
    rows += `
      <tr class="cat-row">
        <td colspan="4">${esc(category)}</td>
      </tr>`;
    for (const { testCase, result } of items) {
      const detail = result?.detail ?? "";
      rows += `
      <tr>
        <td class="col-name">${esc(testCase.name)}</td>
        <td class="col-desc">${esc(testCase.description)}</td>
        <td class="col-status">${badge(result?.status)}</td>
        <td class="col-notes">${esc(detail)}</td>
      </tr>`;
    }
  }

  const title = `${esc(platform.vendor)} ${esc(platform.modelName)} — IPv6 Compliance Report`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 11pt;
      color: #111;
      background: #fff;
      padding: 1.5cm 2cm;
    }
    h1 { font-size: 18pt; margin-bottom: 0.2rem; }
    .subtitle { font-size: 10pt; color: #555; margin-bottom: 1.5rem; }

    .summary {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
      padding: 0.75rem 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f9f9f9;
    }
    .summary-item { display: flex; flex-direction: column; gap: 0.1rem; }
    .summary-label { font-size: 8pt; color: #777; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-value { font-size: 14pt; font-weight: 700; }
    .v-pass    { color: #166534; }
    .v-fail    { color: #991b1b; }
    .v-partial { color: #92400e; }

    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }

    thead th {
      text-align: left;
      font-size: 8.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #555;
      padding: 0.4rem 0.6rem;
      border-bottom: 1.5px solid #bbb;
    }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    .cat-row td {
      background: #f0f0f0;
      font-weight: 700;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.4rem 0.6rem;
      border-top: 1.5px solid #bbb;
    }
    td { padding: 0.45rem 0.6rem; vertical-align: top; }

    .col-name   { width: 22%; font-weight: 600; }
    .col-desc   { width: 33%; color: #333; }
    .col-status { width: 8%; text-align: center; }
    .col-notes  { width: 37%; color: #333; white-space: pre-wrap; word-break: break-word; }

    .footer {
      margin-top: 1.5rem;
      font-size: 8pt;
      color: #999;
      border-top: 1px solid #e5e5e5;
      padding-top: 0.5rem;
    }
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1.1rem;
      background: #1d4ed8;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 10pt;
      cursor: pointer;
      margin-bottom: 1.25rem;
    }
    .print-btn:hover { background: #1e40af; }

    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      .cat-row { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">⬇ Save as PDF / Print</button>
  </div>

  <h1>${esc(platform.vendor)} ${esc(platform.modelName)}</h1>
  <p class="subtitle">${platform.osVersion ? esc(platform.osVersion) + " &nbsp;·&nbsp; " : ""}IPv6 Compliance Report &nbsp;·&nbsp; Generated ${generatedAt}</p>

  <div class="summary">
    <div class="summary-item">
      <span class="summary-label">Pass rate</span>
      <span class="summary-value v-pass">${pct}%</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Pass</span>
      <span class="summary-value v-pass">${passCount}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Fail</span>
      <span class="summary-value v-fail">${failCount}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Partial</span>
      <span class="summary-value v-partial">${partialCount}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">N/A</span>
      <span class="summary-value">${naCount}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Recorded / Total</span>
      <span class="summary-value">${recorded} / ${matrix.length}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-name">Test Case</th>
        <th class="col-desc">Description</th>
        <th class="col-status">Status</th>
        <th class="col-notes">Notes / Evidence</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    ${esc(platform.vendor)} ${esc(platform.modelName)}${platform.osVersion ? " · " + esc(platform.osVersion) : ""} · IPv6 Compliance Tracker · ${generatedAt}
  </div>

  <script>
    const params = new URLSearchParams(location.search);
    if (params.get('autoprint') === '1') window.print();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
