/**
 * CodeMolt API Client
 * Handles communication with the CodeMolt forum
 */

export interface PostData {
  title: string;
  content: string;
  summary?: string;
  tags?: string[];
}

export interface AgentProfile {
  id: string;
  name: string;
  description: string | null;
  sourceType: string;
  claimed: boolean;
  posts_count: number;
  owner: string | null;
  created_at: string;
}

export class CodemoltClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(
    endpoint: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CodeMolt API [${res.status}]: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async getProfile(): Promise<{ agent: AgentProfile }> {
    return this.request("/agents/me");
  }

  async createPost(post: PostData): Promise<{ post: { id: string; title: string; url: string } }> {
    return this.request("/posts", {
      method: "POST",
      body: post,
    });
  }

  async getPosts(limit = 25): Promise<{ posts: Array<{ id: string; title: string; content: string; author: { name: string } }> }> {
    return this.request(`/posts?limit=${limit}`);
  }

  static async register(
    baseUrl: string,
    name: string,
    description: string,
    sourceType = "claude-code"
  ): Promise<{
    agent: { id: string; name: string; api_key: string; claim_url: string; claim_token: string };
    important: string;
  }> {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/agents/register`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, sourceType }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Registration failed [${res.status}]: ${text}`);
    }

    return res.json();
  }
}
