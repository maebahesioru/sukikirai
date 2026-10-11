// 参議院選挙（第1回ツイッタラー参院選・2026-10-11追加）
// 定数は現実の参議院と同じ（45選挙区・フル148＋比例100＝248議席）
// 比例はサン＝ラグ方式（オペレーター指定）・非拘束名簿（党内は得票順）

export type SangiinDistrict = { id: string; name: string; seats: number };

/** 45選挙区・フル定数148（合区: 鳥取・島根 / 徳島・高知） */
export const SANGIIN_DISTRICTS: SangiinDistrict[] = [
  { id: "北海道", name: "北海道選挙区", seats: 6 },
  { id: "青森県", name: "青森県選挙区", seats: 2 },
  { id: "岩手県", name: "岩手県選挙区", seats: 2 },
  { id: "宮城県", name: "宮城県選挙区", seats: 2 },
  { id: "秋田県", name: "秋田県選挙区", seats: 2 },
  { id: "山形県", name: "山形県選挙区", seats: 2 },
  { id: "福島県", name: "福島県選挙区", seats: 2 },
  { id: "茨城県", name: "茨城県選挙区", seats: 4 },
  { id: "栃木県", name: "栃木県選挙区", seats: 2 },
  { id: "群馬県", name: "群馬県選挙区", seats: 2 },
  { id: "埼玉県", name: "埼玉県選挙区", seats: 8 },
  { id: "千葉県", name: "千葉県選挙区", seats: 6 },
  { id: "東京都", name: "東京都選挙区", seats: 12 },
  { id: "神奈川県", name: "神奈川県選挙区", seats: 8 },
  { id: "新潟県", name: "新潟県選挙区", seats: 2 },
  { id: "富山県", name: "富山県選挙区", seats: 2 },
  { id: "石川県", name: "石川県選挙区", seats: 2 },
  { id: "福井県", name: "福井県選挙区", seats: 2 },
  { id: "山梨県", name: "山梨県選挙区", seats: 2 },
  { id: "長野県", name: "長野県選挙区", seats: 2 },
  { id: "岐阜県", name: "岐阜県選挙区", seats: 2 },
  { id: "静岡県", name: "静岡県選挙区", seats: 4 },
  { id: "愛知県", name: "愛知県選挙区", seats: 8 },
  { id: "三重県", name: "三重県選挙区", seats: 2 },
  { id: "滋賀県", name: "滋賀県選挙区", seats: 2 },
  { id: "京都府", name: "京都府選挙区", seats: 4 },
  { id: "大阪府", name: "大阪府選挙区", seats: 8 },
  { id: "兵庫県", name: "兵庫県選挙区", seats: 6 },
  { id: "奈良県", name: "奈良県選挙区", seats: 2 },
  { id: "和歌山県", name: "和歌山県選挙区", seats: 2 },
  { id: "鳥取・島根", name: "鳥取県・島根県選挙区", seats: 2 },
  { id: "岡山県", name: "岡山県選挙区", seats: 2 },
  { id: "広島県", name: "広島県選挙区", seats: 4 },
  { id: "山口県", name: "山口県選挙区", seats: 2 },
  { id: "徳島・高知", name: "徳島県・高知県選挙区", seats: 2 },
  { id: "香川県", name: "香川県選挙区", seats: 2 },
  { id: "愛媛県", name: "愛媛県選挙区", seats: 2 },
  { id: "福岡県", name: "福岡県選挙区", seats: 6 },
  { id: "佐賀県", name: "佐賀県選挙区", seats: 2 },
  { id: "長崎県", name: "長崎県選挙区", seats: 2 },
  { id: "熊本県", name: "熊本県選挙区", seats: 4 },
  { id: "大分県", name: "大分県選挙区", seats: 2 },
  { id: "宮崎県", name: "宮崎県選挙区", seats: 2 },
  { id: "鹿児島県", name: "鹿児島県選挙区", seats: 2 },
  { id: "沖縄県", name: "沖縄県選挙区", seats: 2 },
];

export const SANGIIN_DISTRICT_SEATS = 148;
export const SANGIIN_PROPORTIONAL_SEATS = 100;
export const SANGIIN_TOTAL_SEATS = SANGIIN_DISTRICT_SEATS + SANGIIN_PROPORTIONAL_SEATS; // 248

/** 都道府県 → 参院選挙区ID（合区対応） */
export function prefToSangiinDistrict(pref: string): string {
  if (pref === "鳥取県" || pref === "島根県" || pref === "鳥取" || pref === "島根") return "鳥取・島根";
  if (pref === "徳島県" || pref === "高知県" || pref === "徳島" || pref === "高知") return "徳島・高知";
  if (pref === "北海道") return "北海道";
  return pref.endsWith("県") || pref.endsWith("府") || pref.endsWith("都") ? pref : `${pref}${pref === "東京" ? "都" : pref === "京都" || pref === "大阪" ? "府" : "県"}`;
}
