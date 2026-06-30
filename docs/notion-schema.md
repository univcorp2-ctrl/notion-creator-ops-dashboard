# Notion Schema

## 推奨タスクDB

| 表示名 | 型 | 必須 | 備考 |
| --- | --- | --- | --- |
| Name | Title | Yes | タスク名 |
| Status | Status or Select | Yes | todo / doing / review / blocked / done 相当に正規化 |
| Priority | Select | No | low / medium / high / urgent 相当に正規化 |
| Due Date | Date | No | 期限 |
| Project | Select or Rich text | No | 案件名 |
| Channel | Select | No | SNS / Blog / Landing Page / Development / Real Estate / Research |
| Progress | Number | No | 0〜100 |

## 日本語運用例

| 表示名 | 型 | 対応する環境変数 |
| --- | --- | --- |
| タスク名 | Title | `NOTION_PROP_TITLE=タスク名` |
| ステータス | Status | `NOTION_PROP_STATUS=ステータス` |
| 優先度 | Select | `NOTION_PROP_PRIORITY=優先度` |
| 期限 | Date | `NOTION_PROP_DUE_DATE=期限` |
| 案件 | Select | `NOTION_PROP_PROJECT=案件` |
| カテゴリ | Select | `NOTION_PROP_CHANNEL=カテゴリ` |
| 進捗 | Number | `NOTION_PROP_PROGRESS=進捗` |

## ステータス正規化

| Notion側の例 | Dashboard |
| --- | --- |
| 未着手 / todo | `todo` |
| 進行中 / doing / in progress | `doing` |
| レビュー / 確認 / 承認待ち | `review` |
| 保留 / blocked / stuck | `blocked` |
| 完了 / done / completed | `done` |
