# Research Notes

## 参考にした公開情報

- Notion API official docs: query data sources/databases, filters, properties, and pagination.
- FastAPI full-stack examples: backend/frontend separation, CI, and API-driven UI.
- Open-source Kanban UI examples: status columns, CRUD-oriented cards, and Notion-like board interactions.
- Open-source social media dashboard examples: KPI cards, engagement-rate widgets, and recent-post tables.

## 採用判断

- UIコンポーネントライブラリはあえて入れず、CSSで独自のダークSaaS UIを実装しました。
- Notionは公式API仕様を優先し、data source queryを先に呼び、database queryへフォールバックします。
- SNS実績値は初期MVPではローカルDBに保存し、次段階でCSV/API連携を追加できる構造にしました。
