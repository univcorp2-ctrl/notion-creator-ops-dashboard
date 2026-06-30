// Cloudflare Pages Functions API for the production dashboard.
// Secrets such as NOTION_API_KEY are read from context.env and are never exposed to the browser.

const demoTasks = [
  { id: 'demo-1', title: 'X投稿：新サービスの進捗を共有', project: 'SNS運用', status: 'doing', priority: 'high', due_date: '2026-07-02', channel: 'SNS', progress: 66, source: 'demo', external_url: null, notion_page_id: null, updated_at: '2026-06-30T00:00:00Z' },
  { id: 'demo-2', title: 'Threads投稿：日次作業ログの型を作る', project: 'SNS運用', status: 'todo', priority: 'medium', due_date: '2026-07-03', channel: 'SNS', progress: 20, source: 'demo', external_url: null, notion_page_id: null, updated_at: '2026-06-30T00:00:00Z' },
  { id: 'demo-3', title: '不動産物件AのFacebook投稿文を作成', project: '不動産投稿', status: 'review', priority: 'urgent', due_date: '2026-07-01', channel: 'Real Estate', progress: 82, source: 'demo', external_url: null, notion_page_id: null, updated_at: '2026-06-30T00:00:00Z' },
  { id: 'demo-4', title: 'ブログ記事：個人開発の進捗管理術', project: 'ブログ運営', status: 'doing', priority: 'high', due_date: '2026-07-08', channel: 'Blog', progress: 54, source: 'demo', external_url: null, notion_page_id: null, updated_at: '2026-06-30T00:00:00Z' },
  { id: 'demo-5', title: 'LPのヒーローセクションを改善', project: 'LP改善', status: 'blocked', priority: 'medium', due_date: '2026-07-09', channel: 'Landing Page', progress: 38, source: 'demo', external_url: null, notion_page_id: null, updated_at: '2026-06-30T00:00:00Z' },
  { id: 'demo-6', title: 'Notion連携のプロパティ名を確定', project: '統合ダッシュボード', status: 'done', priority: 'high', due_date: '2026-06-29', channel: 'Development', progress: 100, source: 'demo', external_url: null, notion_page_id: null, updated_at: '2026-06-30T00:00:00Z' }
];

const socialPosts = [
  { id: 'post-1', platform: 'X', title: '新しいダッシュボード構想を公開', status: 'published', scheduled_at: null, published_at: '2026-06-25', impressions: 8200, likes: 512, comments: 42, shares: 114, clicks: 268, source_url: null },
  { id: 'post-2', platform: 'Threads', title: '今日の作業ログ：LP改善と投稿計画', status: 'published', scheduled_at: null, published_at: '2026-06-26', impressions: 4100, likes: 284, comments: 24, shares: 39, clicks: 122, source_url: null },
  { id: 'post-3', platform: 'Blog', title: 'SNSとブログを一体で運用する設計メモ', status: 'published', scheduled_at: null, published_at: '2026-06-28', impressions: 3100, likes: 118, comments: 15, shares: 32, clicks: 690, source_url: null },
  { id: 'post-4', platform: 'Facebook', title: '駅近リノベーション物件の紹介', status: 'scheduled', scheduled_at: '2026-07-01T10:00:00', published_at: null, impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, source_url: null }
];

const propertyPosts = [
  { id: 'property-1', property_name: '東新宿リノベーション物件', platform: 'Facebook', status: 'scheduled', assignee: 'Yuki', due_date: '2026-07-01', address: '東京都新宿区', memo: '写真3枚、駅徒歩情報、周辺施設を入れる' },
  { id: 'property-2', property_name: '横浜ファミリー向けマンション', platform: 'Facebook', status: 'draft', assignee: 'Yuki', due_date: '2026-07-04', address: '神奈川県横浜市', memo: '学区と収納の訴求を強める' },
  { id: 'property-3', property_name: '湾岸タワーマンション', platform: 'Facebook', status: 'analyzing', assignee: 'Yuki', due_date: '2026-07-06', address: '東京都江東区', memo: '過去投稿の反応を確認してCTAを調整' }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function buildSummary(tasks) {
  const today = new Date().toISOString().slice(0, 10);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((task) => task.status === 'done').length;
  const doingTasks = tasks.filter((task) => task.status === 'doing').length;
  const overdueTasks = tasks.filter((task) => task.due_date && task.due_date < today && task.status !== 'done').length;
  const averageProgress = totalTasks ? Number((tasks.reduce((sum, task) => sum + task.progress, 0) / totalTasks).toFixed(1)) : 0;
  const totalImpressions = socialPosts.reduce((sum, post) => sum + post.impressions, 0);
  const totalEngagements = socialPosts.reduce((sum, post) => sum + post.likes + post.comments + post.shares + post.clicks, 0);

  return {
    total_tasks: totalTasks,
    doing_tasks: doingTasks,
    overdue_tasks: overdueTasks,
    done_tasks: doneTasks,
    average_progress: averageProgress,
    social_posts: socialPosts.length,
    total_impressions: totalImpressions,
    total_engagements: totalEngagements,
    engagement_rate: totalImpressions ? Number(((totalEngagements / totalImpressions) * 100).toFixed(2)) : 0,
    property_posts_pending: propertyPosts.filter((post) => post.status !== 'published').length
  };
}

async function queryNotion(env) {
  if (!env.NOTION_API_KEY || !env.NOTION_TASK_DATABASE_ID) return null;

  // Try the current Data Sources endpoint first. Fall back to the older Databases endpoint
  // so the user can paste either a data source ID or a database ID.
  const payload = { page_size: 100 };
  const dataSourceUrl = `https://api.notion.com/v1/data_sources/${env.NOTION_TASK_DATABASE_ID}/query`;
  const databaseUrl = `https://api.notion.com/v1/databases/${env.NOTION_TASK_DATABASE_ID}/query`;
  let response = await notionPost(dataSourceUrl, env, payload);

  if (response.status === 404) {
    response = await notionPost(databaseUrl, env, payload);
  }

  if (!response.ok) {
    const message = await response.text();
    return { error: `Notion API error ${response.status}: ${message.slice(0, 300)}` };
  }

  const data = await response.json();
  return (data.results || []).map((page) => pageToTask(page, env));
}

function notionPost(url, env, payload) {
  return fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.NOTION_API_KEY}`,
      'notion-version': env.NOTION_VERSION || '2022-06-28',
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

function pageToTask(page, env) {
  const properties = page.properties || {};
  return {
    id: page.id,
    title: readTitle(properties, env.NOTION_PROP_TITLE || 'Name') || 'Untitled',
    project: readSelect(properties, env.NOTION_PROP_PROJECT || 'Project', 'Notion'),
    status: normalizeStatus(readSelect(properties, env.NOTION_PROP_STATUS || 'Status', 'todo')),
    priority: normalizePriority(readSelect(properties, env.NOTION_PROP_PRIORITY || 'Priority', 'medium')),
    due_date: readDate(properties, env.NOTION_PROP_DUE_DATE || 'Due Date'),
    channel: normalizeChannel(readSelect(properties, env.NOTION_PROP_CHANNEL || 'Channel', 'Operations')),
    progress: readNumber(properties, env.NOTION_PROP_PROGRESS || 'Progress'),
    source: 'notion',
    external_url: page.url,
    notion_page_id: page.id,
    updated_at: page.last_edited_time || new Date().toISOString()
  };
}

function readTitle(properties, preferredName) {
  const preferred = properties?.[preferredName];
  if (preferred?.type === 'title') return (preferred.title || []).map((part) => part.plain_text).join('');
  for (const value of Object.values(properties || {})) {
    if (value.type === 'title') return (value.title || []).map((part) => part.plain_text).join('');
  }
  return '';
}

function readSelect(properties, name, fallback) {
  const value = properties?.[name];
  if (!value) return fallback;
  if (value.type === 'select' && value.select) return value.select.name;
  if (value.type === 'status' && value.status) return value.status.name;
  if (value.type === 'multi_select' && value.multi_select?.length) return value.multi_select[0].name;
  if (value.type === 'rich_text') return (value.rich_text || []).map((part) => part.plain_text).join('') || fallback;
  return fallback;
}

function readDate(properties, name) {
  const value = properties?.[name];
  return value?.type === 'date' && value.date ? value.date.start : null;
}

function readNumber(properties, name) {
  const value = properties?.[name];
  return value?.type === 'number' && typeof value.number === 'number' ? Math.max(0, Math.min(100, value.number)) : 0;
}

function normalizeStatus(value) {
  const normalized = String(value).trim().toLowerCase();
  if (['done', 'complete', 'completed', '完了', '済', '公開済み', 'published'].includes(normalized)) return 'done';
  if (['doing', 'in progress', 'progress', '進行中', '作業中', '制作中'].includes(normalized)) return 'doing';
  if (['review', '確認', 'レビュー', '承認待ち', '要確認'].includes(normalized)) return 'review';
  if (['blocked', 'stuck', '保留', '停止', 'blocked / waiting'].includes(normalized)) return 'blocked';
  return 'todo';
}

function normalizePriority(value) {
  const normalized = String(value).trim().toLowerCase();
  if (['urgent', '最高', '緊急', '最優先'].includes(normalized)) return 'urgent';
  if (['high', '高', '重要'].includes(normalized)) return 'high';
  if (['low', '低', 'あとで'].includes(normalized)) return 'low';
  return 'medium';
}

function normalizeChannel(value) {
  const normalized = String(value).trim().toLowerCase();
  const map = {
    sns: 'SNS',
    x: 'SNS',
    threads: 'SNS',
    blog: 'Blog',
    'ブログ': 'Blog',
    lp: 'Landing Page',
    'landing page': 'Landing Page',
    development: 'Development',
    '開発': 'Development',
    '不動産': 'Real Estate',
    'real estate': 'Real Estate',
    research: 'Research',
    '調査': 'Research'
  };
  return map[normalized] || 'Operations';
}

async function loadTasks(env) {
  const notionResult = await queryNotion(env);
  if (Array.isArray(notionResult) && notionResult.length > 0) return notionResult;
  return demoTasks;
}

async function createTask(request) {
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  const task = {
    id: `manual-${crypto.randomUUID()}`,
    title: String(body.title || '').trim() || 'Untitled task',
    project: String(body.project || 'Inbox'),
    status: ['todo', 'doing', 'review', 'blocked', 'done'].includes(body.status) ? body.status : 'todo',
    priority: ['low', 'medium', 'high', 'urgent'].includes(body.priority) ? body.priority : 'medium',
    due_date: body.due_date || null,
    channel: normalizeChannel(body.channel || 'Operations'),
    progress: typeof body.progress === 'number' ? Math.max(0, Math.min(100, body.progress)) : 0,
    source: 'manual',
    external_url: null,
    notion_page_id: null,
    updated_at: now
  };

  // Cloudflare Pages Functions are stateless unless D1/KV is added.
  // Return a successful response so the production UI does not break; persistent storage is a next step.
  return json(task, 201);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');

  if (context.request.method === 'OPTIONS') return json({ ok: true });
  if (path === 'health') return json({ status: 'ok', service: 'cloudflare-pages-functions-api' });

  if (path === 'dashboard-summary') {
    const tasks = await loadTasks(context.env);
    return json(buildSummary(tasks));
  }

  if (path === 'tasks') {
    if (context.request.method === 'POST') return createTask(context.request);
    const tasks = await loadTasks(context.env);
    return json(tasks);
  }

  if (path === 'social-posts') return json(socialPosts);
  if (path === 'property-posts') return json(propertyPosts);

  if (path === 'sync/notion' && context.request.method === 'POST') {
    const notionResult = await queryNotion(context.env);
    if (!notionResult) return json({ ok: false, imported: 0, updated: 0, skipped: 0, message: 'Cloudflare Pages Function is live. Add NOTION_API_KEY and NOTION_TASK_DATABASE_ID to enable live Notion sync.' });
    if (notionResult.error) return json({ ok: false, imported: 0, updated: 0, skipped: 0, message: notionResult.error }, 502);
    return json({ ok: true, imported: notionResult.length, updated: 0, skipped: 0, message: `Loaded ${notionResult.length} Notion tasks from production API.` });
  }

  return json({ detail: 'Not found' }, 404);
}
