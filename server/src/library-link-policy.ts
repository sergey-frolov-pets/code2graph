import { createHash } from "node:crypto";
import { AUTH_TOKEN_SECRET } from "./config.js";

export const LIBRARY_LINK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const LIBRARY_LINK_DELIVERIES = ["editor", "view"] as const;
export const LIBRARY_LINK_DATA_ACCESS = ["online", "offline"] as const;
export const LIBRARY_LINK_VIEW_RENDERS = ["snapshot", "live"] as const;

export type LibraryLinkDelivery = (typeof LIBRARY_LINK_DELIVERIES)[number];
export type LibraryLinkDataAccess = (typeof LIBRARY_LINK_DATA_ACCESS)[number];
export type LibraryLinkViewRender = (typeof LIBRARY_LINK_VIEW_RENDERS)[number];

const CAMPAIGN_PATTERN = /^[\w .:_\-]{1,80}$/u;
const LANGUAGE_PATTERN = /^[a-z]{2,8}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const SESSION_PATTERN = /^[A-Za-z0-9-]{16,80}$/;
const BOT_USER_AGENT = /bot|spider|crawler|headless/i;

const SCREEN_WIDTH_PHONE = 400;
const SCREEN_WIDTH_TABLET = 800;
const SCREEN_WIDTH_LAPTOP = 1200;
const SCREEN_WIDTH_DESKTOP = 1600;

export function isLibraryLinkSlug(value: string): boolean {
  return LIBRARY_LINK_SLUG_PATTERN.test(value);
}

export function isLibraryLinkDelivery(value: string): value is LibraryLinkDelivery {
  return (LIBRARY_LINK_DELIVERIES as readonly string[]).includes(value);
}

export function isLibraryLinkDataAccess(
  value: string,
): value is LibraryLinkDataAccess {
  return (LIBRARY_LINK_DATA_ACCESS as readonly string[]).includes(value);
}

export function isLibraryLinkViewRender(
  value: string,
): value is LibraryLinkViewRender {
  return (LIBRARY_LINK_VIEW_RENDERS as readonly string[]).includes(value);
}

export function sanitizeDiagramSvg(svg: string): string | null {
  const trimmed = svg.trim();
  if (!trimmed.startsWith("<svg") || !trimmed.includes("</svg>")) {
    return null;
  }
  if (/<script/i.test(trimmed) || /javascript:/i.test(trimmed)) {
    return null;
  }
  if (/\son[a-z]+\s*=/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function primaryLanguage(value: string | undefined): string {
  const token = value?.trim().toLowerCase().split(/[-_,;]/)[0] ?? "";
  return LANGUAGE_PATTERN.test(token) ? token : "";
}

export function countryCode(value: string | undefined): string {
  const code = value?.trim().toUpperCase() ?? "";
  if (!COUNTRY_PATTERN.test(code) || code === "XX" || code === "T1") {
    return "";
  }
  return code;
}

export function screenBucket(width: number): string {
  if (!Number.isFinite(width) || width <= 0) {
    return "";
  }
  if (width <= SCREEN_WIDTH_PHONE) {
    return "≤400";
  }
  if (width <= SCREEN_WIDTH_TABLET) {
    return "≤800";
  }
  if (width <= SCREEN_WIDTH_LAPTOP) {
    return "≤1200";
  }
  if (width <= SCREEN_WIDTH_DESKTOP) {
    return "≤1600";
  }
  return ">1600";
}

export function sanitizeCampaign(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  return CAMPAIGN_PATTERN.test(trimmed) ? trimmed : "";
}

export function referrerHost(value: string | undefined): string {
  if (!value?.trim()) {
    return "";
  }
  try {
    return new URL(value).host.slice(0, 200);
  } catch {
    return "";
  }
}

export function campaignFromReferrer(value: string | undefined): string {
  if (!value?.trim()) {
    return "";
  }
  try {
    return sanitizeCampaign(new URL(value).searchParams.get("utm_campaign") ?? "");
  } catch {
    return "";
  }
}

export function isBotUserAgent(value: string | undefined): boolean {
  return BOT_USER_AGENT.test(value ?? "");
}

export function parseBrowserFamily(userAgent: string | undefined): string {
  const agent = userAgent ?? "";
  if (/Edg\//.test(agent)) {
    return "Edge";
  }
  if (/OPR\//.test(agent) || /Opera/.test(agent)) {
    return "Opera";
  }
  if (/Firefox\//.test(agent)) {
    return "Firefox";
  }
  if (/Chrome\//.test(agent)) {
    return "Chrome";
  }
  if (/Safari\//.test(agent)) {
    return "Safari";
  }
  return agent.trim() ? "Other" : "";
}

export function parseSystemFamily(userAgent: string | undefined): string {
  const agent = userAgent ?? "";
  if (/Android/.test(agent)) {
    return "Android";
  }
  if (/iPhone|iPad|iPod/.test(agent)) {
    return "iOS";
  }
  if (/Windows/.test(agent)) {
    return "Windows";
  }
  if (/Mac OS X/.test(agent)) {
    return "Mac";
  }
  if (/Linux/.test(agent)) {
    return "Linux";
  }
  return agent.trim() ? "Other" : "";
}

export function isLibraryLinkSessionId(value: string): boolean {
  return SESSION_PATTERN.test(value);
}

export function visitorHash(day: string, sessionId: string, pepper = AUTH_TOKEN_SECRET): string {
  return createHash("sha256").update(`${pepper}:${day}:${sessionId}`).digest("hex");
}

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
