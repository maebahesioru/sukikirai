// 投票トーク関連の型定義

export type PollType = 'two_choice' | 'three_plus_fixed' | 'three_plus_open';

export type Poll = {
  id: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  creator_cookie_id: string;
  related_person_ids: string[]; // 関連する人物のID配列
  created_at: string;
  updated_at: string;
  is_hidden: boolean;
  total_votes: number;
};

export type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
  option_order: number;
  vote_count: number;
  created_by_creator: boolean; // 投稿者が作成したかどうか
  created_at: string;
};

export type PollVote = {
  id: string;
  poll_id: string;
  option_id: string;
  cookie_id: string;
  created_at: string;
};

export type PollComment = {
  id: string;
  poll_id: string;
  comment_number: number;
  name: string | null;
  user_id: string | null;
  content: string;
  created_at: string;
  good_count: number;
  bad_count: number;
  is_hidden: boolean;
  is_reported: boolean;
  parent_comment_id: string | null;
  cookie_id: string;
};

export type PollCommentReaction = {
  id: string;
  poll_comment_id: string;
  reaction_type: 'good' | 'bad';
  cookie_id: string;
  created_at: string;
};
