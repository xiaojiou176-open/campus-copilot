import {
  createProviderProxyRequest,
  type ChatMessage,
  type AiCitationCoverage,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';

export interface CampusCopilotHealthPayload {
  ok: true;
  service: string;
  mode: string;
  requestId?: string;
}

export interface CampusCopilotProviderStatusPayload {
  ok: true;
  requestId?: string;
  providers: Record<string, { ready: boolean; reason: string }>;
}

export interface CampusCopilotChatResponse {
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

export class CampusCopilotApiClient {
  readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(baseUrl: string = 'http://127.0.0.1:8787', fetchImpl: FetchLike = fetch) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
  }

  async health(): Promise<CampusCopilotHealthPayload> {
    const response = await this.fetchImpl(`${this.baseUrl}/health`);
    return (await response.json()) as CampusCopilotHealthPayload;
  }

  async providerStatus(): Promise<CampusCopilotProviderStatusPayload> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/providers/status`);
    return (await response.json()) as CampusCopilotProviderStatusPayload;
  }

  async chat(input: {
    provider: ProviderId;
    model: string;
    messages: ChatMessage[];
    switchyardProvider?: SwitchyardRuntimeProvider;
    switchyardLane?: SwitchyardLane;
  }): Promise<CampusCopilotChatResponse> {
    const request = createProviderProxyRequest(input);
    const response = await this.fetchImpl(`${this.baseUrl}${request.route}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });

    return (await response.json()) as CampusCopilotChatResponse;
  }
}
