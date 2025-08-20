# EPIC-101 Research Plan Workflow — Checklist

## Workflow & Backend
- [ ] Define Mastra ResearchPlanWorkflow: `ExtractMethods` → `DraftPlan` → `.suspend()(review)` → `Finalize` with schemas.
- [ ] Add `POST /api/plans/regenerate` to regenerate a single section; accept `{ projectId, section, hints }` and persist new version.
- [ ] Ensure `/api/runs/[id]/resume` maps Mastra outputs to `plans` and `results` consistently.
- [ ] Extend export template (Markdown + CSL) and attach citations if present.

## UI (Plan Editor)
- [ ] Section-level controls: Regenerate, Reset, and track last modified timestamp.
- [ ] Diff/compare modal for proposed changes vs current.
- [ ] Version history sidebar with restore + preview.
- [ ] Basic validation (non-empty title/RQ) and save states.

## Data & Persistence
- [ ] Plans table: maintain `status` and `created_at` as versions; ensure restore creates a new draft.
- [ ] Add optional `citations` array to plan content; future: normalize table if needed.

## Telemetry/UX
- [ ] Log regenerate events (section, duration) to `tool_invocations` or `results`.
- [ ] Toast/inline feedback for save/restore/regenerate.

## Acceptance Criteria
- [ ] User can regenerate a single section and review/apply changes.
- [ ] Plan versions accumulate and can be restored.
- [ ] Export returns coherent Markdown and CSL; citations included when provided.
