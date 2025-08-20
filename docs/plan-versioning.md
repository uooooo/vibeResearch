# Plan Versioning Semantics (EPIC-101)

MVP acceptance:
- Each save creates a new version (`plans.created_at` ordering), no in-place updates.
- Restore creates a new draft copy derived from the selected version.
- Latest version is returned by `GET /api/plans?projectId=...`.

Implementation notes:
- `POST /api/plans` inserts a new row with provided `title/status` and `content`.
- `POST /api/plans/restore` clones `content` and sets `status = "draft"`.
- `GET /api/plans/history` lists recent versions (id, title, status, created_at).

Operational guidance:
- Treat `status` as a label (draft/final/etc.). Promotion to final is future scope; MVP uses `draft`.
- UI always shows latest; History supports Restore → new draft.
