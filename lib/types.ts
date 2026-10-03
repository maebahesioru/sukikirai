export type Person = {
  id: string;
  handle: string | null;
  name: string;
  description: string;
  tags: string[];
  category: string;
  avatar_url: string | null;
  related: string[];
  followers: number | null;
  is_hidden: boolean;
  source: string;
  x_user_id?: string | null;
  x_status?: string | null;
  x_checked_at?: string | Date | null;
  x_description?: string | null;
  created_at: string;
  updated_at: string;
};

export type VoteStats = {
  likes: number;
  dislikes: number;
  total: number;
  likePct: number;
};

export type EvalStats = {
  counts: Record<string, number>;
  avgs: Record<string, number>;
  total: number;
  overall: number | null;
};

export type CommentRow = {
  id: string;
  person_id: string;
  comment_number: number;
  name: string | null;
  mail?: string | null;
  user_id: string | null;
  gender: string | null;
  age_group: string | null;
  vote_type: "like" | "dislike";
  content: string;
  created_at: string;
  good_count: number;
  bad_count: number;
  is_hidden: boolean;
  is_reported: boolean;
  parent_comment_id: string | null;
  /** 2ch互換の9文字ID（datと同じ値） */
  anon_id?: string;
  /** 内部用（APIには出さない） */
  cookie_id?: string | null;
  /** 投票トーク用: このコメント主が投票した選択肢のラベル */
  voted_option?: string | null;
};

export type CommentWithReplies = CommentRow & { replies: CommentRow[] };

export type PollType = "two_choice" | "three_plus_fixed" | "three_plus_open";

export type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
  image_url: string | null;
  option_order: number;
  vote_count: number;
  created_by_creator: boolean;
  created_by_cookie_id: string | null;
  created_at: string;
};

export type Poll = {
  id: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  creator_cookie_id: string;
  related_person_ids: string[];
  created_at: string;
  updated_at: string;
  is_hidden: boolean;
  total_votes: number;
};

export type PollWithOptions = Poll & { options: PollOption[] };

export type PollCommentRow = {
  id: string;
  poll_id: string;
  comment_number: number;
  name: string | null;
  mail?: string | null;
  user_id: string | null;
  content: string;
  created_at: string;
  good_count: number;
  bad_count: number;
  is_hidden: boolean;
  is_reported: boolean;
  parent_comment_id: string | null;
  /** 2ch互換の9文字ID（datと同じ値） */
  anon_id?: string;
  /** 内部用（APIには出さない） */
  cookie_id?: string | null;
};

export type RankingRow = Person & {
  likes: number;
  dislikes: number;
  total: number;
  likePct: number;
  recentVotes?: number;
  evalCount?: number;
  overall?: number | null;
};

export type XUserCandidate = {
  handle: string;
  name: string;
  avatarUrl: string | null;
  description: string;
  followers: number;
  registered: boolean;
  personId: string | null;
};
