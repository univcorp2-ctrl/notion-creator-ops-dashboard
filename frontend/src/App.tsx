import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Channel, DashboardSummary, Priority, PropertyPost, SocialPost, Task, TaskStatus } from './types';
import { engagement, engagementRate, formatNumber, groupTasksByStatus, isOverdue, priorityLabels, statusLabels } from './lib/metrics';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const columns: TaskStatus[] = ['todo', 'doing', 'review', 'blocked', 'done'];
const channelOptions: Channel[] = ['SNS', 'Blog', 'Landing Page', 'Development', 'Real Estate', 'Research', 'Operations'];
const priorityOptions: Priority[] = ['low', 'medium', 'high', 'urgent'];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function Kpi({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'blue' | 'green' | 'purple' | 'pink' }) {
  return (
    <article className={`kpi ${tone}`}>
      <div className="kpi-icon">◆</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <svg viewBox="0 0 120 42" aria-hidden="true">
        <path d="M4 30 C18 16 28 32 42 20 S68 10 80 24 S98 32 116 12" />
      </svg>
    </article>
  );
}

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (task: Task, status: TaskStatus) => void }) {
  return (
    <article className={`task-card priority-${task.priority} ${isOverdue(task) ? 'is-overdue' : ''}`}>
      <div className="task-card-top">
        <span className="project-pill">{task.project}</span>
        <span className={`source-pill ${task.source}`}>{task.source}</span>
      </div>
      <h3>{task.title}</h3>
      <div className="meta-row">
        <span>{task.channel}</span>
        <span>{task.due_date ?? '期限なし'}</span>
        <span>{priorityLabels[task.priority]}</span>
      </div>
      <div className="progress-line" aria-label={`進捗 ${task.progress}%`}>
        <i style={{ width: `${task.progress}%` }} />
      </div>
      <div className="task-actions">
        <select value={task.status} onChange={(event) => onStatusChange(task, event.target.value as TaskStatus)} aria-label="ステータス変更">
          {columns.map((status) => (
            <option key={status} value={status}>{statusLabels[status]}</option>
          ))}
        </select>
        {task.external_url ? <a href={task.external_url} target="_blank" rel="noreferrer">Notion</a> : <span>local</span>}
      </div>
    </article>
  );
}

function AddTaskForm({ onCreated }: { onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: String(form.get('title') ?? ''),
        project: String(form.get('project') ?? 'Inbox'),
        status: 'todo',
        priority: form.get('priority'),
        channel: form.get('channel'),
        due_date: form.get('due_date') || null,
        progress: Number(form.get('progress') ?? 0),
        source: 'manual',
      }),
    });
    event.currentTarget.reset();
    setSubmitting(false);
    onCreated();
  }

  return (
    <form className="add-task" onSubmit={handleSubmit}>
      <input name="title" required placeholder="新しいタスクを追加" />
      <input name="project" placeholder="案件 / プロジェクト" />
      <select name="channel" defaultValue="Development">
        {channelOptions.map((channel) => <option key={channel}>{channel}</option>)}
      </select>
      <select name="priority" defaultValue="medium">
        {priorityOptions.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
      </select>
      <input name="due_date" type="date" />
      <input name="progress" type="number" min="0" max="100" defaultValue="0" />
      <button disabled={submitting}>{submitting ? '追加中...' : '追加'}</button>
    </form>
  );
}

function MiniTrend({ posts }: { posts: SocialPost[] }) {
  const points = posts.slice(0, 8).map((post) => engagement(post));
  const max = Math.max(...points, 1);
  const path = points.map((value, index) => {
    const x = points.length <= 1 ? 160 : (index / (points.length - 1)) * 320;
    const y = 118 - (value / max) * 88;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg className="trend" viewBox="0 0 340 140" role="img" aria-label="SNS反応トレンド">
      <defs>
        <linearGradient id="trendLine" x1="0" x2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((line) => <line key={line} x1="0" x2="340" y1={28 + line * 28} y2={28 + line * 28} />)}
      <path d={path} fill="none" stroke="url(#trendLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [propertyPosts, setPropertyPosts] = useState<PropertyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  async function loadDashboard() {
    setLoading(true);
    const [nextSummary, nextTasks, nextPosts, nextPropertyPosts] = await Promise.all([
      api<DashboardSummary>('/api/dashboard-summary'),
      api<Task[]>('/api/tasks'),
      api<SocialPost[]>('/api/social-posts'),
      api<PropertyPost[]>('/api/property-posts'),
    ]);
    setSummary(nextSummary);
    setTasks(nextTasks);
    setPosts(nextPosts);
    setPropertyPosts(nextPropertyPosts);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard().catch((error) => {
      setNotice(`API接続に失敗しました: ${error.message}`);
      setLoading(false);
    });
  }, []);

  const groupedTasks = useMemo(() => groupTasksByStatus(tasks), [tasks]);
  const latestPosts = useMemo(() => posts.slice(0, 5), [posts]);

  async function syncNotion() {
    setNotice('Notionと同期しています...');
    const result = await api<{ ok: boolean; message: string; imported: number; updated: number }>('/api/sync/notion', { method: 'POST' });
    setNotice(result.ok ? `Notion同期完了: 追加${result.imported}件 / 更新${result.updated}件` : result.message);
    await loadDashboard();
  }

  async function changeTaskStatus(task: Task, status: TaskStatus) {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    await api(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status, progress: status === 'done' ? 100 : task.progress }) });
    await loadDashboard();
  }

  const doneDeg = summary ? (summary.done_tasks / Math.max(summary.total_tasks, 1)) * 360 : 0;
  const doingDeg = summary ? (summary.doing_tasks / Math.max(summary.total_tasks, 1)) * 360 : 0;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>◆</span><strong>Creator Ops</strong></div>
        <nav>
          <a className="active">ダッシュボード</a>
          <a>Notionタスク</a>
          <a>SNS分析</a>
          <a>不動産Facebook</a>
          <a>案件ロードマップ</a>
          <a>設定</a>
        </nav>
        <div className="sidebar-card">
          <p>Today Focus</p>
          <strong>期限・反応・進捗を1画面で確認</strong>
          <button onClick={syncNotion}>Notion同期</button>
        </div>
      </aside>

      <section className="dashboard">
        <header className="hero">
          <div>
            <p className="eyebrow">Unified Visibility Dashboard</p>
            <h1>タスク、SNS、不動産投稿をクリック一つで見える化</h1>
            <span>NotionのタスクDBを中心に、日々の進捗・期限・優先順位・投稿反応をかんばん方式で整理します。</span>
          </div>
          <div className="hero-actions">
            <button className="secondary" onClick={loadDashboard}>更新</button>
            <button className="primary" onClick={syncNotion}>Notionから同期</button>
          </div>
        </header>

        {notice && <div className="notice">{notice}</div>}

        {loading ? <div className="loading">Loading dashboard...</div> : null}

        {summary && (
          <section className="kpi-grid">
            <Kpi label="総タスク" value={formatNumber(summary.total_tasks)} detail={`平均進捗 ${summary.average_progress}%`} tone="blue" />
            <Kpi label="進行中" value={formatNumber(summary.doing_tasks)} detail={`期限超過 ${summary.overdue_tasks} 件`} tone="purple" />
            <Kpi label="SNS投稿" value={formatNumber(summary.social_posts)} detail={`ER ${summary.engagement_rate}%`} tone="green" />
            <Kpi label="不動産投稿" value={formatNumber(summary.property_posts_pending)} detail="未公開 / 確認中" tone="pink" />
          </section>
        )}

        <section className="grid two-columns">
          <article className="panel kanban-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Kanban</p>
                <h2>案件別タスク進捗</h2>
              </div>
              <span>{tasks.filter((task) => task.source === 'notion').length} Notion tasks</span>
            </div>
            <AddTaskForm onCreated={loadDashboard} />
            <div className="kanban-board">
              {columns.map((status) => (
                <section className="kanban-column" key={status}>
                  <header><span>{statusLabels[status]}</span><b>{groupedTasks[status].length}</b></header>
                  <div className="column-list">
                    {groupedTasks[status].map((task) => <TaskCard key={task.id} task={task} onStatusChange={changeTaskStatus} />)}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="right-stack">
            <article className="panel health-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Workload</p>
                  <h2>現在の集中ポイント</h2>
                </div>
              </div>
              <div className="donut" style={{ background: `conic-gradient(#34d399 0deg ${doneDeg}deg, #8b5cf6 ${doneDeg}deg ${doneDeg + doingDeg}deg, #f472b6 ${doneDeg + doingDeg}deg 360deg)` }}>
                <span>{summary?.average_progress ?? 0}%</span>
              </div>
              <ul className="focus-list">
                {tasks.filter((task) => task.status !== 'done').slice(0, 4).map((task) => (
                  <li key={task.id}><span>{task.title}</span><b>{task.progress}%</b></li>
                ))}
              </ul>
            </article>

            <article className="panel property-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Facebook</p>
                  <h2>不動産投稿管理</h2>
                </div>
              </div>
              {propertyPosts.map((post) => (
                <div className="property-row" key={post.id}>
                  <div>
                    <strong>{post.property_name}</strong>
                    <span>{post.address ?? '住所未設定'} / {post.due_date ?? '期限なし'}</span>
                  </div>
                  <i className={`post-status ${post.status}`}>{post.status}</i>
                </div>
              ))}
            </article>
          </aside>
        </section>

        <section className="grid bottom-grid">
          <article className="panel social-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">SNS Analytics</p>
                <h2>X / Threads / Blog / Facebook</h2>
              </div>
            </div>
            <MiniTrend posts={posts} />
            <div className="post-table">
              {latestPosts.map((post) => (
                <div className="post-row" key={post.id}>
                  <b>{post.platform}</b>
                  <span>{post.title}</span>
                  <em>{formatNumber(post.impressions)} imp</em>
                  <em>{engagementRate(post)}%</em>
                </div>
              ))}
            </div>
          </article>

          <article className="panel plan-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Next Actions</p>
                <h2>次に見るべきもの</h2>
              </div>
            </div>
            <ol>
              <li>Notion側のタスクDBに Integration を接続する</li>
              <li>タスクDBのプロパティ名を README の環境変数に合わせる</li>
              <li>X / Threads / Facebook の実績値をCSVまたはAPI連携に拡張する</li>
              <li>案件ごとにプロジェクト・期限・優先度を揃えて運用する</li>
            </ol>
          </article>
        </section>
      </section>
    </main>
  );
}

export default App;
