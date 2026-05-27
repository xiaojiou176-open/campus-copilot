import {
  createProviderProxyRequest,
  type ChatMessage,
  type AiCitationCoverage,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@opencampus/ai';

export interface OpenCampusHealthPayload {
  ok: true;
  service: string;
  mode: string;
  requestId?: string;
}

export interface OpenCampusProviderStatusPayload {
  ok: true;
  requestId?: string;
  providers: Record<string, { ready: boolean; reason: string }>;
}

export interface OpenCampusChatResponse {
  ok?: boolean;
  provider?: string;
  runtimeProvider?: string;
  lane?: string;
  requestId?: string;
  answerText?: string;
  structuredAnswer?: unknown;
  citationCoverage?: AiCitationCoverage;
  forwardedStatus?: number;
  error?: string;
}

type FetchLike = typeof fetch;

export class OpenCampusApiClient {
  readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(baseUrl: string = 'http://127.0.0.1:8787', fetchImpl: FetchLike = fetch) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
  }

  async health(): Promise<OpenCampusHealthPayload> {
    const response = await this.fetchImpl(`${this.baseUrl}/health`);
    return (await response.json()) as OpenCampusHealthPayload;
  }

  async providerStatus(): Promise<OpenCampusProviderStatusPayload> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/providers/status`);
    return (await response.json()) as OpenCampusProviderStatusPayload;
  }

  async chat(input: {
    provider: ProviderId;
    model: string;
    messages: ChatMessage[];
    switchyardProvider?: SwitchyardRuntimeProvider;
    switchyardLane?: SwitchyardLane;
  }): Promise<OpenCampusChatResponse> {
    const request = createProviderProxyRequest(input);
    const response = await this.fetchImpl(`${this.baseUrl}${request.route}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });

    return (await response.json()) as OpenCampusChatResponse;
  }
}
