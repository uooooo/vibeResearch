# UI Wireframes (text draft)

## Pages
- Home: Domain/keywords input → action buttons
- Theme Explorer: streaming progress + candidates list + comparison
- Plan Editor: editable plan sections + review/suspend input
- Export View: Markdown/CSL preview + download/save

## Home (sketch)
```
[vibeResearch]

Domain: [economics | ai | crypto]
Keywords: [___________________________]

[ Start Theme Exploration ]  [ Load Project ]
```

## Theme Explorer (sketch)
```
<Header: Project/Run Status>

[SSE Stream / Logs]
  - fetching papers...
  - ranked hits: arXiv:xxxx
  - summarizing sections...

[Candidates]
  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ Title A                 │  │ Title B                 │
  │ Novelty ★★★☆  Risk ★★☆ │  │ Novelty ★★★★ Risk ★★☆  │
  │ Key claims / citations  │  │ Key claims / citations  │
  └─────────────────────────┘  └─────────────────────────┘

[Compare Selected]  [Regenerate]  [Continue →] (.suspend())
```

## Plan Editor (sketch)
```
[Selected Theme]

Plan Sections
- RQ / Hypotheses [edit]
- Data Sources [edit]
- Methods / Identification [edit]
- Validation / Ethics [edit]

[Request revision] -> textarea (feedback) -> resume()
[Finalize Plan]
```

## Export View (sketch)
```
[Markdown Preview]
---
# Title
...

[References: CSL]
- Author (Year) Title ...

[ Save to Project ] [ Download .md ]
```

## Notes
- `.suspend()` occurs on Theme choice and Plan review.
- SSE shows progress, hits, summaries; minimal cost/logs visible.
- Comparison uses Novelty/Feasibility/Data Availability/Risk scores.

