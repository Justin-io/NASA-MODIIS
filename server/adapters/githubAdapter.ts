/**
 * GitHub Operational & Ledger Audit Adapter — v2.8.0
 *
 * Integrates GitHub API for sovereign repository tracking, ledger integrity publishing,
 * and incident incident review logs.
 *
 * Env: GITHUB_TOKEN, GITHUB_DEFAULT_OWNER
 */

export interface GitHubStatus {
  configured: boolean;
  owner: string;
  login?: string;
  avatarUrl?: string;
  lastSyncAt: string | null;
}

export interface GitHubRepoSummary {
  name: string;
  fullName: string;
  isPrivate: boolean;
  htmlUrl: string;
  updatedAt: string;
  description: string | null;
}

export class GitHubAdapter {
  private baseUrl = 'https://api.github.com';
  private lastSyncAt: string | null = null;

  private get token(): string | undefined {
    return process.env.GITHUB_TOKEN;
  }

  private get owner(): string {
    return process.env.GITHUB_DEFAULT_OWNER || 'Justin-io';
  }

  public async getStatus(): Promise<GitHubStatus> {
    if (!this.token) {
      return {
        configured: false,
        owner: this.owner,
        lastSyncAt: null,
      };
    }

    try {
      const resp = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'User-Agent': 'ALEX-GitHub-Adapter/2.8',
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: any = await resp.json();
      this.lastSyncAt = new Date().toISOString();

      return {
        configured: true,
        owner: this.owner,
        login: data.login,
        avatarUrl: data.avatar_url,
        lastSyncAt: this.lastSyncAt,
      };
    } catch (err: any) {
      return {
        configured: false,
        owner: this.owner,
        lastSyncAt: null,
      };
    }
  }

  /**
   * Fetches repositories associated with the incident command owner.
   */
  public async getRepositories(limit: number = 10): Promise<GitHubRepoSummary[]> {
    if (!this.token) return [];

    try {
      const resp = await fetch(`${this.baseUrl}/users/${this.owner}/repos?sort=updated&per_page=${Math.min(limit, 20)}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'User-Agent': 'ALEX-GitHub-Adapter/2.8',
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const repos: any[] = await resp.json();

      return repos.map((r) => ({
        name: r.name,
        fullName: r.full_name,
        isPrivate: r.private,
        htmlUrl: r.html_url,
        updatedAt: r.updated_at,
        description: r.description,
      }));
    } catch (err: any) {
      console.warn('[githubAdapter] Failed to list repos:', err.message);
      return [];
    }
  }
}

export const githubAdapter = new GitHubAdapter();

