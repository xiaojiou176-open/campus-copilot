import type { ExportFormat } from '@campus-copilot/exporter';
import type { Site } from '@campus-copilot/schema';
import type { SyncRun, WorkbenchFilter } from '@campus-copilot/storage';
import { formatRelativeTime } from './web-view-helpers';

type WebToolbarBaseProps = {
  topSyncRun?: SyncRun;
  populatedSiteCount: number;
  trackedEntityCount: number;
  unseenUpdateCount: number;
  siteLabels: Record<Site, string>;
};

type WebToolbarProps = WebToolbarBaseProps & {
  ready: boolean;
  now: string;
  feedback: string;
  exportFormat: ExportFormat;
  exportFormats: ExportFormat[];
  filters: WorkbenchFilter;
  siteOrder: Site[];
  onLoadDemo: () => Promise<void>;
  onImportFile: (file: File) => Promise<void>;
  onExportFormatChange: (value: ExportFormat) => void;
  onSiteFilterChange: (value: WorkbenchFilter['site']) => void;
  onOnlyUnseenChange: (value: boolean) => void;
  onExportCurrentView: () => void;
  onExportFocusQueue: () => void;
  onExportWeeklyLoad: () => void;
  onExportChangeJournal: () => void;
};

type WebOrientationHeaderProps = Pick<WebToolbarProps, 'ready' | 'now' | 'populatedSiteCount' | 'unseenUpdateCount' | 'topSyncRun'>;

type WebToolbarControlsProps = Pick<
  WebToolbarProps,
  | 'feedback'
  | 'exportFormat'
  | 'exportFormats'
  | 'filters'
  | 'siteOrder'
  | 'siteLabels'
  | 'onLoadDemo'
  | 'onImportFile'
  | 'onExportFormatChange'
  | 'onSiteFilterChange'
  | 'onOnlyUnseenChange'
  | 'onExportCurrentView'
  | 'onExportFocusQueue'
  | 'onExportWeeklyLoad'
  | 'onExportChangeJournal'
>;

export function WebSupportRail(props: WebToolbarBaseProps) {
  return (
    <section className="support-grid" aria-label="Workspace trust and diagnostics">
      <article className="support-card support-card--trust">
        <p className="eyebrow">Read this first</p>
        <h2>What is on this desk</h2>
        <p className="support-copy">
          Start with the facts already on the desk. Review this slice before you export it or ask AI to explain it.
        </p>
        <div className="support-list support-list--compact" role="list" aria-label="Trust summary rules">
          <div className="support-rule" role="listitem">
            <strong>One shared view</strong>
            <span>Imports, sample resets, export review, and AI explanation all stay on the same local desk.</span>
          </div>
          <div className="support-rule" role="listitem">
            <strong>Manual-only boundary</strong>
            <span>Registration-related and red-zone routes stay outside this product surface.</span>
          </div>
          <div className="support-rule" role="listitem">
            <strong>Review before forward motion</strong>
            <span>Scope, receipts, and export posture stay visible before the explanation layer takes over.</span>
          </div>
        </div>
      </article>

      <article className="support-card support-card--diagnostics">
        <p className="eyebrow">Visible proof</p>
        <h2>What this desk can prove</h2>
        <p className="support-copy">
          Only the receipts already stored here count. This desk does not guess past what it can currently show.
        </p>
        <div className="support-metrics" role="list" aria-label="Workspace diagnostics">
          <div className="support-metric" role="listitem">
            <span>Sites with data</span>
            <strong>{props.populatedSiteCount}</strong>
          </div>
          <div className="support-metric" role="listitem">
            <span>Items on the desk</span>
            <strong>{props.trackedEntityCount}</strong>
          </div>
          <div className="support-metric" role="listitem">
            <span>Unseen updates</span>
            <strong>{props.unseenUpdateCount}</strong>
          </div>
        </div>
        <p className="support-note support-note--receipt">
          {props.topSyncRun
            ? `Latest proof: ${props.siteLabels[props.topSyncRun.site]} · ${props.topSyncRun.outcome} · ${formatRelativeTime(props.topSyncRun.completedAt)}.`
            : 'No stored proof is visible yet. Import a current-view snapshot first to populate this desk.'}
        </p>
      </article>
    </section>
  );
}

export function WebOrientationHeader(props: WebOrientationHeaderProps) {
  return (
    <section className="hero hero--orientation">
      <div className="hero-copy">
        <p className="eyebrow">Start here</p>
        <h1>Campus Copilot workbench</h1>
        <p className="lede">
          One local desk for academic work, administrative signals, and the next decision.
        </p>
      </div>
      <div className="hero-card hero-card--orientation">
        <p>Desk status</p>
        <strong>{props.ready ? 'Local desk ready' : 'Loading your local desk'}</strong>
        <div className="hero-card-grid" role="list" aria-label="Workspace glance">
          <div className="hero-card-cell" role="listitem">
            <span className="hero-card-label">Sites with data</span>
            <strong>{props.populatedSiteCount}</strong>
          </div>
          <div className="hero-card-cell" role="listitem">
            <span className="hero-card-label">Unseen updates</span>
            <strong>{props.unseenUpdateCount}</strong>
          </div>
          <div className="hero-card-cell" role="listitem">
            <span className="hero-card-label">Latest receipt</span>
            <strong>{props.topSyncRun ? formatRelativeTime(props.topSyncRun.completedAt) : 'Waiting'}</strong>
          </div>
        </div>
        <span>Last refresh {formatRelativeTime(props.now)}</span>
        <span className="hero-card-note">Nothing here writes back to campus sites.</span>
      </div>
    </section>
  );
}

export function WebToolbarControls(props: WebToolbarControlsProps) {
  return (
    <section className="toolbar-card toolbar-card--supporting" aria-label="Workbench toolbar">
      <div className="toolbar-groups">
        <section className="toolbar-group toolbar-group--primary" aria-labelledby="web-load-import-group">
          <div className="toolbar-group-header">
            <p className="eyebrow" id="web-load-import-group">
              Load a desk
            </p>
            <p className="toolbar-group-copy">
              Keep this secondary. Open it only when you need a file or a sample snapshot.
            </p>
          </div>
          <details className="toolbar-disclosure toolbar-disclosure--import">
            <summary>Open load tools</summary>
            <div className="toolbar-disclosure-actions">
              <label className="file-button file-button--primary">
                Import workspace snapshot
                <input
                  type="file"
                  accept="application/json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void props.onImportFile(file);
                    }
                  }}
                />
              </label>
              <button type="button" className="quiet-button" onClick={() => void props.onLoadDemo()}>
                Load sample snapshot
              </button>
            </div>
          </details>
        </section>

        <section className="toolbar-group toolbar-group--secondary" aria-labelledby="web-filter-export-group">
          <div className="toolbar-group-header">
            <p className="eyebrow" id="web-filter-export-group">
              Filter / Export
            </p>
            <p className="toolbar-group-copy">
              Filter and export only after the decision lane has already shown the slice you want.
            </p>
          </div>
          <div className="toolbar-row toolbar-row-fields">
            <label>
              Site filter
              <select
                value={props.filters.site}
                onChange={(event) => props.onSiteFilterChange(event.target.value as WorkbenchFilter['site'])}
              >
                <option value="all">All sites</option>
                {props.siteOrder.map((site) => (
                  <option key={site} value={site}>
                    {props.siteLabels[site]}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={props.filters.onlyUnseenUpdates}
                onChange={(event) => props.onOnlyUnseenChange(event.target.checked)}
              />
              <span className="toggle-label">Only unseen updates</span>
            </label>
            <label>
              Export format
              <select value={props.exportFormat} onChange={(event) => props.onExportFormatChange(event.target.value as ExportFormat)}>
                {props.exportFormats.map((format) => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="toolbar-row toolbar-row--actions toolbar-row--secondary-actions">
            <button type="button" className="secondary-button secondary-button--strong" onClick={props.onExportCurrentView}>
              Export current view
            </button>
            <details className="toolbar-disclosure">
              <summary>More export presets</summary>
              <div className="toolbar-disclosure-actions">
                <button type="button" className="quiet-button" onClick={props.onExportFocusQueue}>
                  Export focus queue
                </button>
                <button type="button" className="quiet-button" onClick={props.onExportWeeklyLoad}>
                  Export weekly load
                </button>
                <button type="button" className="quiet-button" onClick={props.onExportChangeJournal}>
                  Export change journal
                </button>
              </div>
            </details>
          </div>
        </section>
      </div>
      <p className="feedback" role="status">
        {props.feedback}
      </p>
    </section>
  );
}

export function WebToolbar(props: WebToolbarProps) {
  return (
    <>
      <WebOrientationHeader
        ready={props.ready}
        now={props.now}
        populatedSiteCount={props.populatedSiteCount}
        unseenUpdateCount={props.unseenUpdateCount}
        topSyncRun={props.topSyncRun}
      />
      <WebToolbarControls {...props} />
    </>
  );
}
