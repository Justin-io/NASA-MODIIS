/**
 * Notion Intelligence Database Adapter — v2.8.0
 *
 * Integrates persistent incident intelligence, situation reports, and command briefings
 * into the team Notion workspace database.
 *
 * Env: NOTION_API_KEY, NOTION_DATABASE_ID
 */

export interface NotionPageResult {
  id: string;
  url: string;
  createdTime: string;
  title: string;
}

export interface NotionAdapterStatus {
  configured: boolean;
  databaseId: string | null;
  botId?: string;
  workspaceName?: string;
  lastSyncAt: string | null;
}

export interface IncidentBriefingPayload {
  incidentId: string;
  title: string;
  severity: string;
  frpMw: number | null;
  areaHa?: number | null;
  summary: string;
  actions: string[];
  authorizedBy: string;
}

export class NotionAdapter {
  private baseUrl = 'https://api.notion.com/v1';
  private notionVersion = '2022-06-28';
  private lastSyncAt: string | null = null;

  private get apiKey(): string | undefined {
    return process.env.NOTION_API_KEY;
  }

  private get databaseId(): string | undefined {
    return process.env.NOTION_DATABASE_ID;
  }

  public getStatus(): NotionAdapterStatus {
    return {
      configured: Boolean(this.apiKey && this.databaseId),
      databaseId: this.databaseId ? `${this.databaseId.slice(0, 8)}...` : null,
      lastSyncAt: this.lastSyncAt,
    };
  }

  /**
   * Logs an incident briefing and operational command actions to the Notion database.
   */
  public async logIncidentBriefing(payload: IncidentBriefingPayload): Promise<NotionPageResult> {
    if (!this.apiKey || !this.databaseId) {
      throw new Error('NOTION_API_KEY or NOTION_DATABASE_ID not configured');
    }

    const titleText = `[ALEX Incident] ${payload.title} (${payload.incidentId})`;

    const blocks: any[] = [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Executive Incident Briefing' } }],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { text: { content: `Severity: ${payload.severity} | FRP: ${payload.frpMw ?? 'N/A'} MW | Authorized By: ${payload.authorizedBy}\n` } },
            { text: { content: payload.summary } },
          ],
        },
      },
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ text: { content: 'Immediate Operational Actions' } }],
        },
      },
      ...payload.actions.map((act) => ({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{ text: { content: act } }],
          checked: false,
        },
      })),
      {
        object: 'block',
        type: 'divider',
        divider: {},
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { text: { content: `Logged automatically by ALEX Autonomous Environmental Intelligence at ${new Date().toISOString()}` } },
          ],
        },
      },
    ];

    const resp = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Notion-Version': this.notionVersion,
        'Content-Type': 'application/json',
        'User-Agent': 'ALEX-Notion-Adapter/2.8',
      },
      body: JSON.stringify({
        parent: { database_id: this.databaseId },
        properties: {
          Name: {
            title: [{ text: { content: titleText } }],
          },
        },
        children: blocks,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Notion API error ${resp.status}: ${err}`);
    }

    const data: any = await resp.json();
    this.lastSyncAt = new Date().toISOString();

    return {
      id: data.id,
      url: data.url || `https://notion.so/${data.id.replace(/-/g, '')}`,
      createdTime: data.created_time || this.lastSyncAt,
      title: titleText,
    };
  }

  /**
   * Fetches recent entries logged in the incident intelligence database.
   */
  public async getRecentPages(limit: number = 10): Promise<NotionPageResult[]> {
    if (!this.apiKey || !this.databaseId) {
      return [];
    }

    try {
      const resp = await fetch(`${this.baseUrl}/databases/${this.databaseId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Notion-Version': this.notionVersion,
          'Content-Type': 'application/json',
          'User-Agent': 'ALEX-Notion-Adapter/2.8',
        },
        body: JSON.stringify({ page_size: Math.min(limit, 20) }),
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: any = await resp.json();
      const results: any[] = data.results || [];

      return results.map((item: any) => {
        const titleProp = item.properties?.Name?.title?.[0]?.plain_text || 'Untitled Briefing';
        return {
          id: item.id,
          url: item.url || `https://notion.so/${item.id.replace(/-/g, '')}`,
          createdTime: item.created_time,
          title: titleProp,
        };
      });
    } catch (err: any) {
      console.warn('[notionAdapter] Failed to query recent pages:', err.message);
      return [];
    }
  }
}

export const notionAdapter = new NotionAdapter();

