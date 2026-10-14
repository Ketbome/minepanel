import axios from 'axios';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PanelRequest {
  method: HttpMethod;
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
}

// Tool output goes into the model's context; a whole log or world file would flood it.
export const MAX_RESPONSE_CHARS = 100_000;

export class PanelApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Every MCP tool is a call to the panel's own REST API with the caller's token, so the auth
// guard and controllers stay the only place that decides what a token may do.
export class PanelApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async request({ method, path, query, body }: PanelRequest): Promise<unknown> {
    const response = await axios.request<string>({
      baseURL: this.baseUrl,
      url: path,
      method,
      params: query,
      data: body,
      headers: { Authorization: `Bearer ${this.token}` },
      responseType: 'text',
      transformResponse: (data) => data,
      validateStatus: () => true,
    });

    const parsed = parse(response.data);
    if (response.status >= 400) {
      const message = typeof parsed === 'object' && parsed && 'message' in parsed ? (parsed as { message: unknown }).message : parsed;
      throw new PanelApiError(response.status, `${response.status}: ${Array.isArray(message) ? message.join('; ') : String(message || 'Request failed')}`);
    }

    return parsed;
  }
}

const parse = (text: string | undefined): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
