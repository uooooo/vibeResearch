最低限のチェックリスト
 すべての重要テーブルで RLS 有効 & デフォルト deny

 SELECT/INSERT/UPDATE/DELETE 各ポリシーで auth.uid() による境界定義

 service_role はサーバ専用（NEXT_PUBLIC_ 禁止）

 重要な書き込みは Server Route/Action 経由＋Zod 検証

 Storage は private 基本・署名URLは短期

 API 応答の キャッシュ禁止（no-store）

 Edge Functions は CORS/Origin/Rate limit を設定

 監査ログ（誰が何をいつ）を保存

 マイグレーションで RLS/制約の回帰テストを実施