import type { ExportPreset } from '@campus-copilot/exporter';
import { type UiText } from './surface-shell-view-helpers';

export function PopupQuickExportPanel(props: {
  text: UiText;
  onExport: (preset: ExportPreset) => Promise<void>;
}) {
  return (
    <div className="surface__grid">
      <article className="surface__panel">
        <h2>{props.text.popup.quickExport}</h2>
        <div className="surface__actions surface__actions--wrap">
          <button className="surface__button surface__button--secondary" onClick={() => void props.onExport('weekly_assignments')}>
            {props.text.popup.weeklyAssignments}
          </button>
          <button className="surface__button surface__button--ghost" onClick={() => void props.onExport('current_view')}>
            {props.text.popup.currentView}
          </button>
        </div>
      </article>
    </div>
  );
}
