import type { WorkbenchPanelsProps } from './workbench-panels-props';
import {
  WorkbenchDecisionSections,
  WorkbenchOperationsSections,
  WorkbenchOverviewSections,
} from './workbench-panel-sections';

export function WorkbenchPanels(props: WorkbenchPanelsProps) {
  return (
    <>
      <WorkbenchOverviewSections {...props} />
      <WorkbenchDecisionSections {...props} />
      <WorkbenchOperationsSections {...props} />
    </>
  );
}
