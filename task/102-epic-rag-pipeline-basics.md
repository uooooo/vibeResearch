# 102 EPIC: RAG Pipeline Basics

- Status: Planned (staged for v1)
- Priority: High
- Owner: TBD

## Goal
PDF/URLからの取込→チャンク→pgvector格納→検索の最小フローを実現し、エージェントの根拠提示を支える。

## Scope
- 取込: URL/PDF→テキスト抽出→正規化（初期は貼り付けテキストで代替可）
- チャンク: セクション優先の分割（段落＋~1k chars、後で見出し/セマンティック分割）
- 埋め込み: ベクトル生成→pgvector保存（OpenAI `text-embedding-3-small` を想定）
- 検索: キーワード + ベクトルのハイブリッド（pgvector `<=>`）

## Deliverables
- `src/lib/rag/*` に最小関数群（ingest/split/embed/search）
- Supabaseの `documents/chunks` に保存

## Acceptance Criteria
- サンプル入力で検索→要約→出典メタ（section/offset/hash）を出力し、CSL へ写像可能

## Dependencies
- 003 ドメインモデル / 103 Supabase
