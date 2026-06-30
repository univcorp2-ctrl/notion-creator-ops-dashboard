import { describe, expect, it } from 'vitest';
import { engagement, engagementRate, groupTasksByStatus, isOverdue } from './metrics';
import type { Task } from '../types';

const task: Task = {
  id: '1',
  title: 'Sample',
  project: 'Dashboard',
  status: 'doing',
  priority: 'high',
  due_date: '2026-07-01',
  channel: 'Development',
  progress: 50,
  source: 'manual',
  external_url: null,
  notion_page_id: null,
  updated_at: '2026-06-30T00:00:00Z',
};

describe('dashboard metrics', () => {
  it('calculates engagement totals and rate', () => {
    const post = { impressions: 1000, likes: 80, comments: 10, shares: 20, clicks: 40 };
    expect(engagement(post)).toBe(150);
    expect(engagementRate(post)).toBe(15);
  });

  it('groups kanban tasks by status', () => {
    const groups = groupTasksByStatus([task, { ...task, id: '2', status: 'done' }]);
    expect(groups.doing).toHaveLength(1);
    expect(groups.done).toHaveLength(1);
  });

  it('detects overdue active tasks', () => {
    expect(isOverdue(task, '2026-07-02')).toBe(true);
    expect(isOverdue({ ...task, status: 'done' }, '2026-07-02')).toBe(false);
  });
});
