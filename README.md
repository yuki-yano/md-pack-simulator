# MD パックシミュレーター

マスターデュエルのパック期待値や達成確率などを計算する、Vite + React 製の SPA です。

本番環境は Cloudflare Workers Static Assets の assets-only Worker として配信しています。

- Production: <https://pack-simulator.miyauchidp.dev>
- Worker: `md-pack-simulator`

## 必要環境

- Node.js 24 以上
- pnpm 11.20.0

## コマンド

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm preview
pnpm dev:worker
pnpm deploy
```

`pnpm dev:worker` はビルド後に `wrangler dev` を起動し、Cloudflare Workers Static Assets 相当の構成をローカルで確認します。

## デプロイ

`main` ブランチへの push を契機に、Cloudflare Workers Builds がテスト、lint、ビルドを実行して Worker を自動デプロイします。

カスタムドメイン `pack-simulator.miyauchidp.dev` は `wrangler.jsonc` の routes ではなく、Cloudflare ダッシュボードの Worker の Domains & Routes で管理します。手動デプロイが必要な場合は `pnpm deploy` を実行します。
