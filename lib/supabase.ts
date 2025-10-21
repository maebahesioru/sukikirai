import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // セッション永続化を無効化（不要なストレージアクセスを削減）
  },
  realtime: {
    params: {
      eventsPerSecond: 1, // リアルタイムイベントを制限
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'hikamers-sukikirai', // クライアント識別
    },
  },
});

// Database types
export type Vote = {
  id: string;
  person_id: string;
  vote_type: 'like' | 'dislike';
  created_at: string;
  cookie_id: string;
};

export type Comment = {
  id: string;
  person_id: string;
  comment_number: number;
  name: string | null;
  user_id: string | null;
  vote_type: 'like' | 'dislike';
  content: string;
  created_at: string;
  good_count: number;
  bad_count: number;
  is_hidden: boolean;
  is_reported: boolean;
  parent_comment_id: string | null;
};

export type NgWord = {
  id: string;
  word: string;
  person_id: string | null; // null means global
  created_at: string;
};

export type Report = {
  id: string;
  comment_id: string;
  reason: string;
  created_at: string;
};

export type CommentReaction = {
  id: string;
  comment_id: string;
  reaction_type: 'good' | 'bad';
  cookie_id: string;
  ip_address: string | null;
  created_at: string;
};
