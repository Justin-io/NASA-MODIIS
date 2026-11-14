/**
 * Telegram Alert Service
 * Sends fire intelligence alerts via Telegram Bot API (native fetch, HTML parse mode).
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

interface TelegramResponse {
  ok: boolean;
  result?: { message_id: number; date: number };
  description?: string;
  error_code?: number;
}

interface FireAlertPayload {
  fireId?: string;
  regionName?: string;
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  frpMw?: number;
  lat?: number;
  lng?: number;
  detectedAt?: string;
  confidence?: number;
  activeCells?: number;
  windSpeedKmh?: number;
  windDirection?: string;
  evacuationZones?: string[];
}

interface EvacuationOrderPayload {
  orderId?: string;
  regionName?: string;
  zones?: string[];
  threatLevel?: 'WATCH' | 'WARNING' | 'EMERGENCY';
  affectedPopulation?: number;
  evacuationRoutes?: string[];
  shelterLocations?: string[];
  issuedBy?: string;
  issuedAt?: string;
  deadline?: string;
}

type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

interface AlertResult {
  success: boolean;
  messageId?: number;
  timestamp: string;
  error?: string;
}

function severityEmoji(severity?: string): string {
  switch (severity) {
    case 'EXTREME': return '🔥🔥🔥';
    case 'HIGH':    return '🔥🔥';
    case 'MODERATE': return '🔥';
    default:        return '⚠️';
  }
}

function levelEmoji(level: AlertLevel): string {
  switch (level) {
    case 'CRITICAL': return '🚨';
    case 'WARNING':  return '⚠️';
    default:         return 'ℹ️';
  }
}

class TelegramAlertService {
  private get token(): string {
    return process.env.TELEGRAM_BOT_TOKEN ?? '';
  }
  private get chatId(): string {
    return process.env.TELEGRAM_CHAT_ID ?? '';
  }
  private get baseUrl(): string {
    return `https://api.telegram.org/bot${this.token}`;
  }
  private messageCount = 0;
  private lastError: string | null = null;

  private async send(text: string): Promise<AlertResult> {
    if (!this.token || !this.chatId) {
      this.lastError = 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured';
      return { success: false, timestamp: new Date().toISOString(), error: this.lastError };
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    this.chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      const data = (await response.json()) as TelegramResponse;

      if (!data.ok) {
        this.lastError = data.description ?? 'Unknown Telegram error';
        return { success: false, timestamp: new Date().toISOString(), error: this.lastError };
      }

      this.messageCount++;
      this.lastError = null;
      return {
        success:   true,
        messageId: data.result?.message_id,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      this.lastError = err.message ?? 'Network error';
      return { success: false, timestamp: new Date().toISOString(), error: this.lastError ?? undefined };
    }
  }

  async sendFireAlert(payload: FireAlertPayload): Promise<AlertResult> {
    const {
      fireId       = 'UNKNOWN',
      regionName   = 'Unknown Region',
      severity     = 'MODERATE',
      frpMw,
      lat, lng,
      detectedAt,
      confidence,
      activeCells,
      windSpeedKmh,
      windDirection,
      evacuationZones = [],
    } = payload;

    const emoji = severityEmoji(severity);
    const lines: string[] = [
      `${emoji} <b>WILDFIRE ALERT — ${severity}</b> ${emoji}`,
      '',
      `<b>Fire ID:</b> ${fireId}`,
      `<b>Region:</b> ${regionName}`,
      `<b>Detected:</b> ${detectedAt ?? new Date().toISOString()}`,
    ];

    if (frpMw !== undefined)      lines.push(`<b>FRP:</b> ${frpMw.toFixed(1)} MW`);
    if (lat !== undefined && lng !== undefined) lines.push(`<b>Location:</b> ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
    if (confidence !== undefined) lines.push(`<b>Confidence:</b> ${confidence}%`);
    if (activeCells !== undefined) lines.push(`<b>Active Cells:</b> ${activeCells}`);
    if (windSpeedKmh !== undefined || windDirection) {
      lines.push(`<b>Wind:</b> ${windSpeedKmh ?? '?'} km/h ${windDirection ?? ''}`);
    }
    if (evacuationZones.length > 0) {
      lines.push(`<b>Evacuation Zones:</b> ${evacuationZones.join(', ')}`);
    }

    lines.push('', '<i>ALEX Wildfire Intelligence System — NASA</i>');
    return this.send(lines.join('\n'));
  }

  async sendEvacuationOrder(payload: EvacuationOrderPayload): Promise<AlertResult> {
    const {
      orderId          = `EVO-${Date.now()}`,
      regionName       = 'Unknown Region',
      zones            = [],
      threatLevel      = 'WARNING',
      affectedPopulation,
      evacuationRoutes = [],
      shelterLocations = [],
      issuedBy         = 'ALEX System',
      issuedAt,
      deadline,
    } = payload;

    const lines: string[] = [
      `🚨 <b>EVACUATION ORDER — ${threatLevel}</b> 🚨`,
      '',
      `<b>Order ID:</b> ${orderId}`,
      `<b>Region:</b> ${regionName}`,
      `<b>Issued By:</b> ${issuedBy}`,
      `<b>Issued At:</b> ${issuedAt ?? new Date().toISOString()}`,
    ];

    if (deadline) lines.push(`<b>Deadline:</b> ${deadline}`);
    if (zones.length > 0) lines.push(`<b>Affected Zones:</b> ${zones.join(', ')}`);
    if (affectedPopulation !== undefined) lines.push(`<b>Est. Population:</b> ${affectedPopulation.toLocaleString()}`);
    if (evacuationRoutes.length > 0) lines.push(`<b>Routes:</b> ${evacuationRoutes.join(' | ')}`);
    if (shelterLocations.length > 0) lines.push(`<b>Shelters:</b> ${shelterLocations.join(' | ')}`);

    lines.push('', '⚠️ <b>EVACUATE IMMEDIATELY — Follow official guidance</b> ⚠️');
    lines.push('<i>ALEX Wildfire Intelligence System — NASA</i>');
    return this.send(lines.join('\n'));
  }

  async sendSystemAlert(message: string, level: AlertLevel = 'INFO'): Promise<AlertResult> {
    const emoji = levelEmoji(level);
    const text = [
      `${emoji} <b>SYSTEM ALERT [${level}]</b>`,
      '',
      message,
      '',
      `<i>ALEX Backend • ${new Date().toISOString()}</i>`,
    ].join('\n');
    return this.send(text);
  }

  getStatus() {
    return {
      configured:   Boolean(this.token && this.chatId),
      messageCount: this.messageCount,
      lastError:    this.lastError,
      chatId:       this.chatId ? `****${this.chatId.slice(-4)}` : 'NOT_SET',
      tokenSet:     Boolean(this.token),
    };
  }
}

export const telegramAlertService = new TelegramAlertService();
