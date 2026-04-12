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

export function WebSupportRail(props: WebToolbarBaseProps) {
  return (
    <section className="support-grid" aria-label="Workspace trust and diagnostics">
      <article className="support-card support-card--trust">
        <p className="eyebrow">Supporting trust layer</p>
        <h2>Trust summary</h2>
        <p className="support-copy">
          Local-first evidence comes first. AI only explains the visible workspace after the receipts are
          already on screen.
        </p>
        <div className="support-list support-list--compact" role="list" aria-label="Trust summary rules">
          <div className="support-rule" role="listitem">
            <strong>Shared contract</strong>
            <span>Imports and demo resets stay inside the same schema and storage path.</span>
          </div>
          <div className="support-rule" role="listitem">
            <strong>Manual-only boundary</strong>
            <span>Registration-related and red-zone routes stay outside this product surface.</span>
          </div>
          <div className="support-rule" role="listitem">
            <strong>Cited AI follows</strong>
            <span>The explanation layer comes after workbench truth, exported slices, and receipts.</span>
          </div>
        </div>
      </article>

      <article className="support-card support-card--diagnostics">
        <p className="eyebrow">Supporting diagnostics</p>
        <h2>Diagnostics and receipts</h2>
        <p className="support-copy">This layer only reports what the imported workspace can currently prove.</p>
        <div className="support-metrics" role="list" aria-label="Workspace diagnostics">
          <article className="support-metric" role="listitem">
            <span>Imported sites with data</span>
            <strong>{props.populatedSiteCount}</strong>
          </article>
          <article className="support-metric" role="listitem">
            <span>Tracked entities</span>
            <strong>{props.trackedEntityCount}</strong>
          </article>
          <article className="support-metric" role="listitem">
            <span>Unseen updates</span>
            <strong>{props.unseenUpdateCount}</strong>
          </article>
        </div>
        <p className="support-note support-note--receipt">
          {props.topSyncRun
            ? `Latest stored sync receipt: ${props.siteLabels[props.topSyncRun.site]} · ${props.topSyncRun.outcome} · ${formatRelativeTime(props.topSyncRun.completedAt)}.`
            : 'No stored sync receipt is visible yet. Import a current-view snapshot first to populate diagnostics and change receipts.'}
        </p>
      </article>
    </section>
  );
}

export function WebToolbar(props: WebToolbarProps) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Campus Copilot Web Workbench</p>
          <h1>Student decision workspace</h1>
          <p className="lede">
            One local workspace where academic work and administrative signals stay grouped on the same decision desk.
          </p>
          <p className="hero-support">
            This local-first academic decision workspace keeps shared storage, exported evidence, and
            visible receipts in front. Cited AI explains the workspace after the facts are already visible, not before.
          </p>
        </div>
        <div className="hero-card">
          <p>Workspace truth</p>
          <strong>{props.ready ? 'Shared storage/read-model loaded' : 'Bootstrapping local workspace'}</strong>
          <span>Last refresh {formatRelativeTime(props.now)}</span>
          <span className="hero-card-note">Local-first and read-only on the same schema/export contract.</span>
        </div>
      </section>

      <section className="toolbar-card" aria-label="Workbench toolbar">
        <div className="toolbar-groups">
          <section className="toolbar-group toolbar-group--primary" aria-labelledby="web-load-import-group">
            <div className="toolbar-group-header">
              <p className="eyebrow" id="web-load-import-group">
                Load / Import
              </p>
              <p className="toolbar-group-copy">Bring a local snapshot into the workbench without changing the source systems.</p>
            </div>
            <div className="toolbar-row toolbar-row--actions">
              <label className="file-button file-button--primary">
                Import current-view JSON
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
                Load demo workspace
              </button>
            </div>
          </section>

          <section className="toolbar-group toolbar-group--secondary" aria-labelledby="web-filter-export-group">
            <div className="toolbar-group-header">
              <p className="eyebrow" id="web-filter-export-group">
                Filter / Export
              </p>
              <p className="toolbar-group-copy">Shape the current view first, then export the exact slice you want to share or review.</p>
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
          </section>
        </div>
        <p className="feedback" role="status">
          {props.feedback}
        </p>
      </section>
    </>
  );
}
