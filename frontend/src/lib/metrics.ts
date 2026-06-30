import type { Priority, SocialPost, Task, TaskStatus } from '../types';

export const statusLabels: Record<TaskStatus, string> = {
  todo: '未着手',
  doing: '進行中',
  review: 'レビュー',
  blocked: '要確認',
  done: '完了',
};

export const priorityLabels: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '緊急',
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ja-JP').format(value);
}

export function engagement(post: Pick<SocialPost, 'likes' | 'comments' | 'shares' | 'clicks'>): number {
  return post.likes + post.comments + post.shares + post.clicks;
}

export function engagementRate(post: Pick<SocialPost, 'impressions' | 'likes' | 'comments' | 'shares' | 'clicks'>): number {
  if (post.impressions <= 0) return 0;
  return Number(((engagement(post) / post.impressions) * 100).toFixed(2));
}

export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  return tasks.reduce<Record<TaskStatus, Task[]>>(
    (groups, task) => {
      groups[task.status].push(task);
      return groups;
    },
    { todo: [], doing: [], review: [], blocked: [], done: [] },
  );
}

export function isOverdue(task: Pick<Task, 'due_date' | 'status'>, today = new Date().toISOString().slice(0, 10)): boolean {
  return Boolean(task.due_date && task.due_date < today && task.status !== 'done');
}
