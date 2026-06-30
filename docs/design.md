# GPT Image Design Reference

## 生成したデザインの方向性

このリポジトリのUIは、GPT Imageで生成した参照イメージを元にしています。

- ダークモードのSaaS分析ダッシュボード
- 左サイドバー、ヒーロー、KPIカード、トレンドチャート、かんばん、投稿一覧
- ネオンブルー、パープル、グリーン、ピンクのアクセントカラー
- 進捗と反応を数秒で把握できるカード密度
- SNS運用、不動産Facebook投稿、Notionタスクを同じ情報設計で整理

## 実装への落とし込み

| 画像上の要素 | 実装 |
| --- | --- |
| サイドバー | `frontend/src/App.tsx` の `<aside className="sidebar">` |
| KPIカード | `Kpi` コンポーネント |
| 円グラフ | CSS `conic-gradient` による集中ポイント |
| トレンドチャート | SVG `MiniTrend` |
| かんばん | `TaskCard` と `kanban-board` |
| 投稿一覧 | `post-table` |

## 生成プロンプトの要旨

> Sleek dark-mode SaaS dashboard, Japanese UI, creator task management, SNS analytics, kanban board, Notion task visibility, Facebook real-estate posting workflow, neon accents, glassmorphism cards, elegant and practical layout.
