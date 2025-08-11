# 104 EPIC: UI Foundation (Tailwind + shadcn/ui)

- Status: Done
- Priority: High
- Owner: TBD

## Goal
Tailwind v4 と shadcn/ui を導入し、レイアウト・テーマ・共通コンポーネント土台を構築する。

## Scope
- Tailwind v4 設定/ビルド確認
- shadcn/ui 導入（必要コンポーネントのジェネレート）
- レイアウト/ヘッダー/ナビ/Toast/ThemeToggle

## Deliverables
- 最小UIフレーム（Home/Theme/Plan/Export に展開可能）

## Acceptance Criteria
- ページ間のルーティングと共通レイアウトが機能
- ダーク/ライト切替が動作

## Dependencies
- 002 技術選定

## Progress
- [x] Tailwind v4 設定/ビルド確認（`globals.css` + packages）
- [x] 共通レイアウト/ヘッダー/ナビ/ThemeToggle（`layout.tsx`/`Header`）
- [ ] shadcn/ui 導入（必要コンポーネントのジェネレート）

