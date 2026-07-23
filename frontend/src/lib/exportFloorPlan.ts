import { getFloorFinish, resolveFloorFinishId } from '@/config/floorFinishes';
import { roomTypePreset } from '@/config/roomTypes';
import { computeFloorPlanOverview } from '@/lib/homeLayout';
import { formatFeetInches, formatFeetInchesPair } from '@/lib/imperialDimensions';
import type { Room } from '@/types';

const SCALE = 10; // px per foot
const PLAN_PAD_FT = 6;
const HEADER_H = 72;
const SUMMARY_H = 44;
const FOOTER_H = 28;
const SCHEDULE_W = 280;
const SCHEDULE_GAP = 28;
const WALL_FT = 0.5;

export interface FloorPlanExportInput {
  projectName: string;
  rooms: Room[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'floor-plan';
}

function houseRooms(rooms: Room[]): Room[] {
  return rooms.filter((r) => !r.linkedSiteStructureId);
}

/** Build a printable SVG: plan + house size + per-room measurements + schedule. */
export function buildFloorPlanExportSvg(input: FloorPlanExportInput): string {
  const rooms = houseRooms(input.rooms);
  const overview = computeFloorPlanOverview(rooms);
  const { bounds } = overview;

  const planW = (bounds.widthFt + PLAN_PAD_FT * 2) * SCALE;
  const planH = (bounds.depthFt + PLAN_PAD_FT * 2) * SCALE;
  const originX = bounds.minX - PLAN_PAD_FT;
  const originZ = bounds.minZ - PLAN_PAD_FT;

  const scheduleRows = [...rooms].sort((a, b) => a.name.localeCompare(b.name));
  const scheduleBodyH = Math.max(planH, 40 + scheduleRows.length * 22 + 8);
  const contentH = Math.max(planH, scheduleBodyH);
  const svgW = Math.ceil(40 + planW + SCHEDULE_GAP + SCHEDULE_W + 24);
  const svgH = Math.ceil(HEADER_H + SUMMARY_H + contentH + FOOTER_H + 24);

  const planOx = 24;
  const planOy = HEADER_H + SUMMARY_H;
  const scheduleX = planOx + planW + SCHEDULE_GAP;
  const scheduleY = planOy;

  const footprintLabel = formatFeetInchesPair(
    overview.footprintWidthFt,
    overview.footprintDepthFt,
  );
  const totalArea = `${overview.totalSqFt.toLocaleString()} sq ft`;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const wallPad = WALL_FT * SCALE;
  const boxX = (bounds.minX - originX) * SCALE - wallPad;
  const boxY = (bounds.minZ - originZ) * SCALE - wallPad;
  const boxW = bounds.widthFt * SCALE + wallPad * 2;
  const boxH = bounds.depthFt * SCALE + wallPad * 2;

  const roomShapes = rooms
    .map((room) => {
      const lx = room.layoutX ?? 0;
      const lz = room.layoutZ ?? 0;
      const x = (lx - originX) * SCALE;
      const y = (lz - originZ) * SCALE;
      const w = room.widthFt * SCALE;
      const h = room.depthFt * SCALE;
      const fill = getFloorFinish(resolveFloorFinishId(room)).planTint;
      const sizeLabel = formatFeetInchesPair(room.widthFt, room.depthFt);
      const wLabel = formatFeetInches(room.widthFt);
      const dLabel = formatFeetInches(room.depthFt);
      const name = escapeXml(room.name);
      const fontSize = Math.min(12, Math.max(8, Math.min(w, h) / 8));
      const dimFont = Math.min(10, Math.max(7, fontSize - 1));

      return `
      <g>
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"
          rx="2" fill="${fill}" stroke="#44403c" stroke-width="1.5"/>
        <text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 - 6).toFixed(1)}"
          text-anchor="middle" fill="#1c1917"
          font-family="ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" font-weight="700">${name}</text>
        <text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 + 10).toFixed(1)}"
          text-anchor="middle" fill="#44403c"
          font-family="ui-sans-serif, system-ui, sans-serif" font-size="${dimFont}" font-weight="600">${escapeXml(sizeLabel)}</text>
        <text x="${(x + w / 2).toFixed(1)}" y="${(y + h - 5).toFixed(1)}"
          text-anchor="middle" fill="#57534e"
          font-family="ui-sans-serif, system-ui, sans-serif" font-size="8">${escapeXml(wLabel)}</text>
        <text x="${(x + 6).toFixed(1)}" y="${(y + h / 2).toFixed(1)}"
          text-anchor="middle" fill="#57534e"
          font-family="ui-sans-serif, system-ui, sans-serif" font-size="8"
          transform="rotate(-90 ${(x + 6).toFixed(1)} ${(y + h / 2).toFixed(1)})">${escapeXml(dLabel)}</text>
      </g>`;
    })
    .join('');

  const scheduleHeader = `
    <text x="${scheduleX}" y="${scheduleY + 14}" fill="#78716c"
      font-family="ui-sans-serif, system-ui, sans-serif" font-size="10" font-weight="700"
      letter-spacing="0.06em">ROOM SCHEDULE</text>
    <line x1="${scheduleX}" y1="${scheduleY + 22}" x2="${scheduleX + SCHEDULE_W}" y2="${scheduleY + 22}"
      stroke="#d6d3d1" stroke-width="1"/>
    <text x="${scheduleX}" y="${scheduleY + 38}" fill="#a8a29e"
      font-family="ui-sans-serif, system-ui, sans-serif" font-size="9" font-weight="600">Room</text>
    <text x="${scheduleX + 130}" y="${scheduleY + 38}" fill="#a8a29e"
      font-family="ui-sans-serif, system-ui, sans-serif" font-size="9" font-weight="600">Size (W × D)</text>
    <text x="${scheduleX + SCHEDULE_W}" y="${scheduleY + 38}" text-anchor="end" fill="#a8a29e"
      font-family="ui-sans-serif, system-ui, sans-serif" font-size="9" font-weight="600">Area</text>`;

  const scheduleBody = scheduleRows
    .map((room, i) => {
      const rowY = scheduleY + 56 + i * 22;
      const size = formatFeetInchesPair(room.widthFt, room.depthFt);
      const area = Math.round(room.widthFt * room.depthFt);
      const typeLabel = roomTypePreset(room.type).label;
      return `
      <text x="${scheduleX}" y="${rowY}" fill="#1c1917"
        font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="600">${escapeXml(room.name)}</text>
      <text x="${scheduleX}" y="${rowY + 11}" fill="#78716c"
        font-family="ui-sans-serif, system-ui, sans-serif" font-size="9">${escapeXml(typeLabel)}</text>
      <text x="${scheduleX + 130}" y="${rowY}" fill="#44403c"
        font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">${escapeXml(size)}</text>
      <text x="${scheduleX + SCHEDULE_W}" y="${rowY}" text-anchor="end" fill="#44403c"
        font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">${area.toLocaleString()} sf</text>`;
    })
    .join('');

  const emptyState =
    rooms.length === 0
      ? `<text x="${(planW / 2).toFixed(1)}" y="${(planH / 2).toFixed(1)}" text-anchor="middle"
          fill="#78716c" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14">No rooms to export</text>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="100%" height="100%" fill="#fafaf9"/>
  <text x="24" y="32" fill="#1c1917"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="700">${escapeXml(input.projectName)}</text>
  <text x="24" y="52" fill="#78716c"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="12">Floor plan · dimensions in feet &amp; inches</text>

  <rect x="24" y="${HEADER_H}" width="${svgW - 48}" height="36" rx="8" fill="#f5f5f4" stroke="#e7e5e4"/>
  <text x="40" y="${HEADER_H + 23}" fill="#44403c"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" font-weight="600">House size: ${escapeXml(footprintLabel)}</text>
  <text x="${Math.floor(svgW * 0.42)}" y="${HEADER_H + 23}" fill="#44403c"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" font-weight="600">Total area: ${escapeXml(totalArea)}</text>
  <text x="${Math.floor(svgW * 0.72)}" y="${HEADER_H + 23}" fill="#44403c"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" font-weight="600">Rooms: ${overview.roomCount}</text>

  <g transform="translate(${planOx}, ${planOy})">
    <rect x="0" y="0" width="${planW}" height="${planH}" fill="#f5f3f0" stroke="#e7e5e4" rx="4"/>
    <rect x="${boxX.toFixed(1)}" y="${boxY.toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}"
      fill="none" stroke="#78716c" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="${(boxX + boxW / 2).toFixed(1)}" y="${(boxY - 8).toFixed(1)}" text-anchor="middle" fill="#57534e"
      font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="700">${escapeXml(formatFeetInches(bounds.widthFt))} wide</text>
    <text x="${(boxX - 10).toFixed(1)}" y="${(boxY + boxH / 2).toFixed(1)}" text-anchor="middle" fill="#57534e"
      font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="700"
      transform="rotate(-90 ${(boxX - 10).toFixed(1)} ${(boxY + boxH / 2).toFixed(1)})">${escapeXml(formatFeetInches(bounds.depthFt))} long</text>
    ${roomShapes}
    ${emptyState}
  </g>

  ${scheduleHeader}
  ${scheduleBody}

  <text x="24" y="${svgH - 12}" fill="#a8a29e"
    font-family="ui-sans-serif, system-ui, sans-serif" font-size="10">Home AI · ${escapeXml(dateLabel)} · Footprint is bounding box of all rooms</text>
</svg>`;
}

export function floorPlanExportFilename(projectName: string, ext: 'svg' | 'png'): string {
  return `${slugify(projectName)}-floor-plan.${ext}`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadFloorPlanSvg(input: FloorPlanExportInput): void {
  const svg = buildFloorPlanExportSvg(input);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, floorPlanExportFilename(input.projectName, 'svg'));
}

/** Rasterize the export SVG to PNG (browser only). */
export async function downloadFloorPlanPng(input: FloorPlanExportInput): Promise<void> {
  const svg = buildFloorPlanExportSvg(input);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas');
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))),
        'image/png',
      );
    });
    triggerDownload(pngBlob, floorPlanExportFilename(input.projectName, 'png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load export image'));
    img.src = url;
  });
}
