# KOMA / 鼓膜ぶち破れ - Cloudflare Pages + D1版

## 構成

- `index.html` - ゲーム本体
- `functions/api/ranking.js` - ランキングAPI
- `migrations/0001_create_rankings.sql` - D1テーブル作成
- `wrangler.toml` - D1バインディング設定

## 1. D1を作成

```bash
npx wrangler login
npx wrangler d1 create koma-ranking
```

表示された `database_id` を `wrangler.toml` の `YOUR_D1_DATABASE_ID` に入れます。

## 2. 本番D1へマイグレーション

```bash
npx wrangler d1 migrations apply koma-ranking --remote
```

## 3. Cloudflare Pagesにデプロイ

GitHub等にこのフォルダをpushしてPagesプロジェクトに接続します。

Build commandが不要な静的サイトなら、ビルドコマンドは空欄、出力ディレクトリはプロジェクトルート（`/`）にします。

Functionsはプロジェクトルートの `functions/` ディレクトリから自動的に認識されます。

## 4. D1をPagesにバインド

Cloudflare Dashboard → Workers & Pages → 対象Pagesプロジェクト → Settings → Bindings → Add → D1 database bindings

Variable name: `DB`

D1 database: `koma-ranking`

ProductionだけでなくPreviewでもテストする場合は、Preview側にも必要に応じてバインディングを設定してください。

## API

GET `/api/ranking?limit=1000`

POST `/api/ranking`

POST body:

```json
{
  "name": "名無し",
  "score": 1234,
  "db": 87.6
}
```

ランキングはサーバー側でTOP 1000に制限されます。
