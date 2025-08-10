# 103 EPIC: Supabase Auth & Persistence

- Status: Planned
- Priority: High
- Owner: TBD

## Goal
Supabaseの接続/認証/保存を整備し、RLS前提でprojects中心のデータ永続化を実現する。

## Scope
- SDK: `@supabase/supabase-js` セットアップ（client/server）
- Auth: ログインUI（最小）/ セッション管理
- DB: スキーマ反映/マイグレーション手順（ドキュメント）
- 保存: runs/plans/results/citations の書込/読込

## Deliverables
- 接続ユーティリティと最小UI
- ドキュメント（RLS方針/環境変数）

## Acceptance Criteria
- ログイン後のみプロジェクトが作成・閲覧できる
- RLSを破らない最小クエリでCRUD可能

## Dependencies
- 002 技術選定 / 003 ドメインモデル

