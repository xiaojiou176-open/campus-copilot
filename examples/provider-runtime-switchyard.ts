import {
  DEFAULT_SWITCHYARD_RUNTIME,
  ProviderStatusResponseSchema,
  SwitchyardChatResponseSchema,
  SwitchyardProxyPayloadSchema,
  buildSwitchyardInput,
} from '@campus-copilot/provider-runtime';

const payload = SwitchyardProxyPayloadSchema.parse({
  provider: DEFAULT_SWITCHYARD_RUNTIME.provider,
  lane: DEFAULT_SWITCHYARD_RUNTIME.lane,
  model: 'gpt-5',
  messages: [
    { role: 'system', content: 'Keep Campus semantics stable.' },
    { role: 'user', content: 'Summarize the current trust gaps.' },
  ],
});

const status = ProviderStatusResponseSchema.parse({
  requestId: 'req-status',
  ok: true,
  providers: {
    openai: { ready: false, reason: 'missing_api_key' },
    gemini: { ready: true, reason: 'configured' },
    switchyard: { ready: true, reason: 'configured_local_runtime' },
  },
});

const response = SwitchyardChatResponseSchema.parse({
  requestId: 'req-switchyard',
  ok: true,
  provider: 'switchyard',
  runtimeProvider: payload.provider,
  lane: payload.lane ?? DEFAULT_SWITCHYARD_RUNTIME.lane,
  forwardedStatus: 200,
  answerText: 'Start with the earliest deadline still missing confirmation.',
});

console.log(
  JSON.stringify(
    {
      input: buildSwitchyardInput(payload.messages),
      switchyardReady: status.providers.switchyard.ready,
      answerText: response.answerText,
    },
    null,
    2,
  ),
);
