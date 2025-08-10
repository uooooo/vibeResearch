# 102 EPIC: RAG Pipeline Basics

- Status: Planned
- Priority: High
- Owner: TBD

## Goal
PDF/URLからの取込→チャンク→pgvector格納→検索の最小フローを実現し、エージェントの根拠提示を支える。

## Scope
- 取込: テキスト抽出（ダミー/プレーン）→正規化
- チャンク: セクション優先の分割（パラメータ化）
- 埋め込み: ベクトル生成→pgvector保存（擬似/実装は段階導入）
- 検索: ベクトル + BM25ハイブリッドの骨子

## Deliverables
- `src/lib/rag/*` に最小関数群
- Supabaseの `documents/chunks` に保存

## Acceptance Criteria
- サンプル入力で検索→要約→出典メタ（section/offset/hash）を出力

## Dependencies
- 003 ドメインモデル / 103 Supabase

