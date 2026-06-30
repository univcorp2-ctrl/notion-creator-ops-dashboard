export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Channel = 'SNS' | 'Blog' | 'Landing Page' | 'Development' | 'Real Estate' | 'Research' | 'Operations';
export type SocialPlatform = 'X' | 'Threads' | 'Blog' | 'Facebook';
export type SocialStatus = 'draft' | 'scheduled' | 'published' | 'analyzing';

export interface Task {
  id: string;
  title: string;
  project: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  channel: Channel;
  progress: number;
  source: 'demo' | 'manual' | 'notion';
  external_url: string | null;
  notion_page_id: string | null;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  title: string;
  status: SocialStatus;
  scheduled_at: string | null;
  published_at: string | null;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  source_url: string | null;
}

export interface PropertyPost {
  id: string;
  property_name: string;
  platform: SocialPlatform;
  status: SocialStatus;
  assignee: string;
  due_date: string | null;
  address: string | null;
  memo: string | null;
}

export interface DashboardSummary {
  total_tasks: number;
  doing_tasks: number;
  overdue_tasks: number;
  done_tasks: number;
  average_progress: number;
  social_posts: number;
  total_impressions: number;
  total_engagements: number;
  engagement_rate: number;
  property_posts_pending: number;
}
