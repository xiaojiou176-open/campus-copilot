import {
  getAcademicAiCallerGuardrails,
  getAiSitePolicyOverlay,
  type AiStructuredAnswer,
  type ProviderId,
  type SwitchyardLane,
  type SwitchyardRuntimeProvider,
} from '@campus-copilot/ai';
import type { ExportArtifact } from '@campus-copilot/exporter';
import type { ImportedArtifactEnvelope } from './import-export-snapshot';

export function WebAiPanel(props: {
  provider: ProviderId;
  model: string;
  switchyardProvider: SwitchyardRuntimeProvider;
  switchyardLane: SwitchyardLane;
  providers: Array<{ value: ProviderId; label: string; model: string }>;
  aiBaseUrl: string;
  question: string;
  aiPending: boolean;
  aiError?: string;
    aiNotice?: string;
    aiAnswer?: string;
    aiStructured?: AiStructuredAnswer;
    currentViewExport?: ExportArtifact;
    importedEnvelope?: ImportedArtifactEnvelope;
    availableCourses: Array<{ id: string; label: string }>;
  advancedMaterialEnabled: boolean;
  advancedMaterialCourseId: string;
  advancedMaterialExcerpt: string;
  advancedMaterialAcknowledged: boolean;
  onAiBaseUrlChange: (value: string) => void;
  onProviderChange: (value: ProviderId) => void;
  onModelChange: (value: string) => void;
  onSwitchyardProviderChange: (value: SwitchyardRuntimeProvider) => void;
  onSwitchyardLaneChange: (value: SwitchyardLane) => void;
  onQuestionChange: (value: string) => void;
  onAdvancedMaterialEnabledChange: (value: boolean) => void;
  onAdvancedMaterialCourseChange: (value: string) => void;
  onAdvancedMaterialExcerptChange: (value: string) => void;
  onAdvancedMaterialAcknowledgedChange: (value: boolean) => void;
  onAskAi: () => Promise<void>;
}) {
  const aiGuardrails = getAcademicAiCallerGuardrails();
  const redZoneHardStop = aiGuardrails.redZone.primaryHardStop;
  const advancedMaterialGuard = aiGuardrails.advancedMaterial;
  const currentPackaging = props.currentViewExport?.packaging;
  const currentScope = props.currentViewExport?.scope;
  const currentAiBlocked = currentPackaging ? !currentPackaging.aiAllowed : true;
  const currentPolicyOverlay = getAiSitePolicyOverlay(currentScope?.site);
  const importedPackaging = props.importedEnvelope?.packaging;

  function formatProvenance(labels: ExportArtifact['packaging']['provenance'] | undefined) {
    if (!labels?.length) {
      return 'No provenance chain carried into this surface yet.';
    }
    return labels.map((entry) => entry.label).join(' · ');
  }

  return (
    <section className="panel ai-panel">
      <div className="ai-panel-heading">
        <div className="item-header">
          <div>
            <p className="eyebrow">Cited AI</p>
            <h2>Ask AI about this workspace</h2>
          </div>
          <span className="badge">explanation layer</span>
        </div>
        <p className="meta">
          Review scope, sharing notes, and trust cues in the desk review drawer first. This panel stays in a supporting
          role: ask from the visible workspace first, then open the deeper trust and connection notes only when you
          actually need them.
        </p>
      </div>

      {props.importedEnvelope ? (
        <p className="meta">
          Imported snapshot envelope: {props.importedEnvelope.title ?? 'Untitled artifact'} ·{' '}
          {props.importedEnvelope.scope?.scopeType ?? 'unknown scope'} · AI{' '}
          {props.importedEnvelope.packaging?.aiAllowed ? 'allowed' : 'blocked'}.
        </p>
      ) : null}
      {currentAiBlocked ? (
        <p className="feedback">
          Ask AI stays blocked on the web surface until the current export envelope carries Layer 2 approval.
        </p>
      ) : null}

      <details className="advanced-settings advanced-settings--subdued">
        <summary>Trust, boundaries, and sources</summary>
        <div className="ai-structured ai-structured--advanced">
          <div>
            <p className="meta-title">Boundary and evidence first</p>
          </div>
          <div className="ai-explanation-strip" aria-label="AI visibility and boundaries">
            <article className="guidance-card">
              <p className="meta-title">What AI can see</p>
              <strong>Visible workspace evidence</strong>
              <p>
                The current workbench slice, focus queue, weekly load, planning pulse, and exported current
                view that are already visible in this workspace.
              </p>
            </article>
            <article className="guidance-card guidance-card--warning">
              <p className="meta-title">What AI cannot do</p>
              <strong>Manual-only guardrail</strong>
              <p>{aiGuardrails.redZone.summary}</p>
            </article>
            <article className="guidance-card">
              <p className="meta-title">Read-only posture</p>
              <strong>Explanation follows the review desk</strong>
              <p>
                Runtime controls and provider settings remain tertiary. The workbench, its receipts, and its export
                review stay first.
              </p>
            </article>
          </div>

          <div>
            <p className="meta-title">Current review envelope</p>
          </div>
          <div className="ai-explanation-strip" aria-label="Current export and policy envelope">
            <article className={`guidance-card ${currentAiBlocked ? 'guidance-card--warning' : ''}`}>
              <p className="meta-title">Sharing boundary</p>
              <strong>
                {currentPackaging
                  ? `Read/export ${currentPackaging.authorizationLevel} · AI ${currentPackaging.aiAllowed ? 'allowed' : 'blocked'}`
                  : 'No current review envelope yet'}
              </strong>
              <p>
                {currentPackaging
                  ? `Risk ${currentPackaging.riskLabel} · match ${currentPackaging.matchConfidence}. ${
                      currentPackaging.aiAllowed
                        ? 'The current slice can carry AI explanation.'
                        : 'The current slice still needs Layer 2 approval before AI can read it.'
                    }`
                  : 'Load a workspace snapshot before asking AI or exporting from the web surface.'}
              </p>
            </article>
            <article className="guidance-card">
              <p className="meta-title">Current view export</p>
              <strong>
                {currentScope ? `${currentScope.scopeType} · ${currentScope.resourceFamily}` : 'Waiting for a loaded workspace'}
              </strong>
              <p>
                {currentScope?.site ? `Site: ${currentScope.site}. ` : 'Site: multi-site. '}
                {currentScope?.courseIdOrKey ? `Course: ${currentScope.courseIdOrKey}.` : 'Course scope: all visible courses.'}
              </p>
            </article>
            <article className="guidance-card">
              <p className="meta-title">Site policy overlay</p>
              <strong>{currentPolicyOverlay ? currentPolicyOverlay.siteLabel : 'No site-specific overlay yet'}</strong>
              <p>
                {currentPolicyOverlay
                  ? `Allowed structured families: ${currentPolicyOverlay.allowedFamilies.join(', ')}. Export-first only: ${
                      currentPolicyOverlay.exportOnlyFamilies.join(', ') || 'none'
                    }. Forbidden AI objects: ${currentPolicyOverlay.forbiddenAiObjects.join(', ') || 'none'}.`
                  : 'Load a site-scoped workspace slice to review the active overlay before asking AI.'}
              </p>
            </article>
            <article className="guidance-card">
              <p className="meta-title">Provenance</p>
              <strong>{importedPackaging ? 'Imported truth is preserved' : 'Using current web workbench packaging'}</strong>
              <p>{formatProvenance(importedPackaging?.provenance ?? currentPackaging?.provenance)}</p>
            </article>
          </div>
        </div>
      </details>

      <div className="ai-question-block">
        <div className="ai-question-copy">
          <p className="meta-title">Question</p>
          <strong>Ask after reviewing the visible evidence</strong>
          <p className="meta">Suggested prompts keep the model anchored to the reviewed facts already on screen.</p>
        </div>
        <label className="question-field">
          Question
          <textarea value={props.question} onChange={(event) => props.onQuestionChange(event.target.value)} rows={4} />
        </label>
        <div className="badge-row">
          <span className="badge">What AI can see</span>
          <span className="badge badge-warning">What AI cannot do</span>
        </div>
        <div className="toolbar-row ai-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => void props.onAskAi()}
            disabled={props.aiPending || currentAiBlocked}
          >
            {props.aiPending ? 'Asking AI…' : 'Ask AI'}
          </button>
        </div>
      </div>

      <div className="ai-answer-zone">
        <div className="item-header">
          <div>
            <p className="meta-title">Answer with citations</p>
            <strong>Cited answer zone</strong>
          </div>
          {props.aiStructured?.citations.length ? (
            <span className="badge badge-success">cited</span>
          ) : props.aiAnswer ? (
            <span className="badge badge-warning">uncited answer</span>
          ) : (
            <span className="badge">waiting</span>
          )}
        </div>

        {props.aiError ? (
          <p className="error" role="status" aria-live="polite">
            {props.aiError}
          </p>
        ) : null}
        {props.aiNotice ? (
          <p className="feedback" role="status" aria-live="polite">
            {props.aiNotice}
          </p>
        ) : null}

        {props.aiStructured ? (
          <div className="ai-structured ai-structured--answer">
            {props.aiStructured.citations.length ? (
              <div className="ai-citation-strip">
                {props.aiStructured.citations.map((citation) => (
                  <span className="badge" key={`${citation.entityId}:${citation.kind}`}>
                    {citation.site} · {citation.title}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="answer">{props.aiStructured.summary}</p>
            {props.aiStructured.bullets.length ? (
              <>
                <p className="meta-title">Key points</p>
                <ul>
                  {props.aiStructured.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {props.aiStructured.nextActions.length ? (
              <>
                <p className="meta-title">Suggested next actions</p>
                <ul>
                  {props.aiStructured.nextActions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : props.aiAnswer ? (
          <div className="ai-structured ai-structured--answer">
            <p className="answer">{props.aiAnswer}</p>
          </div>
        ) : (
          <p className="meta">Waiting for a cited answer. Ask after the workbench and export slice look right.</p>
        )}
      </div>

      <p className="meta-title">Advanced settings and opt-ins</p>
      <details className="advanced-settings advanced-settings--material" open={props.advancedMaterialEnabled}>
        <summary>Advanced material analysis</summary>
        <div className="ai-structured ai-structured--advanced">
          <div className="item-header">
            <div>
              <p className="meta-title">Manual opt-in lane</p>
              <strong>{advancedMaterialGuard.toggleLabel}</strong>
            </div>
            <span className="badge">{props.advancedMaterialEnabled ? 'manual opt-in' : 'default off'}</span>
          </div>
          <p>{advancedMaterialGuard.note}</p>
          <p>
            Enable excerpt analysis for one course only. The only supported advanced path is a
            course-scoped opt-in with a user-pasted excerpt.
          </p>
          <label className="toggle toggle--stacked">
            <input
              type="checkbox"
              checked={props.advancedMaterialEnabled}
              onChange={(event) => props.onAdvancedMaterialEnabledChange(event.target.checked)}
            />
            <span className="toggle-label">Enable excerpt analysis for one course</span>
          </label>
          {props.advancedMaterialEnabled ? (
            <div className="ai-controls ai-controls--advanced">
              <label>
                Opt-in course
                <select
                  value={props.advancedMaterialCourseId}
                  onChange={(event) => props.onAdvancedMaterialCourseChange(event.target.value)}
                >
                  <option value="">Select one visible course</option>
                  {props.availableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ai-controls__wide">
                Paste the excerpt you want analyzed
                <textarea
                  rows={5}
                  value={props.advancedMaterialExcerpt}
                  onChange={(event) => props.onAdvancedMaterialExcerptChange(event.target.value)}
                />
              </label>
              <label className="toggle toggle--stacked ai-controls__wide">
                <input
                  type="checkbox"
                  checked={props.advancedMaterialAcknowledged}
                  onChange={(event) => props.onAdvancedMaterialAcknowledgedChange(event.target.checked)}
                />
                <span className="toggle-label">
                  I confirm this excerpt is for my own course context, I am opting in for this one course
                  explicitly, and rights/policy compliance remain my responsibility.
                </span>
              </label>
            </div>
          ) : null}
        </div>
      </details>

      <details className="advanced-settings">
        <summary>Advanced connection settings</summary>
        <p className="meta">
          These controls stay available for targeted opt-ins and connection debugging, but they are not
          the main path of this surface.
        </p>
        <div className="ai-controls">
          <label>
            Local AI service URL
            <input value={props.aiBaseUrl} onChange={(event) => props.onAiBaseUrlChange(event.target.value)} />
          </label>
          <label>
            Provider
            <select value={props.provider} onChange={(event) => props.onProviderChange(event.target.value as ProviderId)}>
              {props.providers.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model
            <input value={props.model} onChange={(event) => props.onModelChange(event.target.value)} />
          </label>
          {props.provider === 'switchyard' ? (
            <>
              <label>
                Switchyard provider
                <select
                  value={props.switchyardProvider}
                  onChange={(event) => props.onSwitchyardProviderChange(event.target.value as SwitchyardRuntimeProvider)}
                >
                  <option value="chatgpt">ChatGPT</option>
                  <option value="gemini">Gemini</option>
                  <option value="claude">Claude</option>
                  <option value="grok">Grok</option>
                  <option value="qwen">Qwen</option>
                </select>
              </label>
              <label>
                Switchyard lane
                <select value={props.switchyardLane} onChange={(event) => props.onSwitchyardLaneChange(event.target.value as SwitchyardLane)}>
                  <option value="web">web</option>
                  <option value="byok">byok</option>
                </select>
              </label>
            </>
          ) : null}
        </div>
      </details>
    </section>
  );
}
