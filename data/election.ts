// ツイッタラー衆院選 基礎データ（2026-10-10・2022年区割り/現行定数・Wikipediaで検算済み）

export const ELECTION_BASE = {
  totalSeats: 465,
  districtSeats: 289,
  proportionalSeats: 176,
} as const;

export type Block = { id: string; name: string; seats: number };

export const BLOCKS: Block[] = [
  { id: "hokkaido", name: "北海道", seats: 8 },
  { id: "tohoku", name: "東北", seats: 12 },
  { id: "kitakanto", name: "北関東", seats: 19 },
  { id: "minamikanto", name: "南関東", seats: 23 },
  { id: "tokyo", name: "東京", seats: 19 },
  { id: "hokurikushinetsu", name: "北陸信越", seats: 10 },
  { id: "tokai", name: "東海", seats: 21 },
  { id: "kinki", name: "近畿", seats: 28 },
  { id: "chugoku", name: "中国", seats: 10 },
  { id: "shikoku", name: "四国", seats: 6 },
  { id: "kyushu", name: "九州", seats: 20 },
];

export type Pref = { name: string; districts: number; blockId: string };

export const PREFS: Pref[] = [
  { name: "北海道", districts: 12, blockId: "hokkaido" },
  { name: "青森県", districts: 3, blockId: "tohoku" },
  { name: "岩手県", districts: 3, blockId: "tohoku" },
  { name: "宮城県", districts: 5, blockId: "tohoku" },
  { name: "秋田県", districts: 3, blockId: "tohoku" },
  { name: "山形県", districts: 3, blockId: "tohoku" },
  { name: "福島県", districts: 4, blockId: "tohoku" },
  { name: "茨城県", districts: 7, blockId: "kitakanto" },
  { name: "栃木県", districts: 5, blockId: "kitakanto" },
  { name: "群馬県", districts: 5, blockId: "kitakanto" },
  { name: "埼玉県", districts: 16, blockId: "kitakanto" },
  { name: "千葉県", districts: 14, blockId: "minamikanto" },
  { name: "神奈川県", districts: 20, blockId: "minamikanto" },
  { name: "山梨県", districts: 2, blockId: "minamikanto" },
  { name: "東京都", districts: 30, blockId: "tokyo" },
  { name: "新潟県", districts: 5, blockId: "hokurikushinetsu" },
  { name: "富山県", districts: 3, blockId: "hokurikushinetsu" },
  { name: "石川県", districts: 3, blockId: "hokurikushinetsu" },
  { name: "福井県", districts: 2, blockId: "hokurikushinetsu" },
  { name: "長野県", districts: 5, blockId: "hokurikushinetsu" },
  { name: "岐阜県", districts: 5, blockId: "tokai" },
  { name: "静岡県", districts: 8, blockId: "tokai" },
  { name: "愛知県", districts: 16, blockId: "tokai" },
  { name: "三重県", districts: 4, blockId: "tokai" },
  { name: "滋賀県", districts: 3, blockId: "kinki" },
  { name: "京都府", districts: 6, blockId: "kinki" },
  { name: "大阪府", districts: 19, blockId: "kinki" },
  { name: "兵庫県", districts: 12, blockId: "kinki" },
  { name: "奈良県", districts: 3, blockId: "kinki" },
  { name: "和歌山県", districts: 2, blockId: "kinki" },
  { name: "鳥取県", districts: 2, blockId: "chugoku" },
  { name: "島根県", districts: 2, blockId: "chugoku" },
  { name: "岡山県", districts: 4, blockId: "chugoku" },
  { name: "広島県", districts: 6, blockId: "chugoku" },
  { name: "山口県", districts: 3, blockId: "chugoku" },
  { name: "徳島県", districts: 2, blockId: "shikoku" },
  { name: "香川県", districts: 3, blockId: "shikoku" },
  { name: "愛媛県", districts: 3, blockId: "shikoku" },
  { name: "高知県", districts: 2, blockId: "shikoku" },
  { name: "福岡県", districts: 11, blockId: "kyushu" },
  { name: "佐賀県", districts: 2, blockId: "kyushu" },
  { name: "長崎県", districts: 3, blockId: "kyushu" },
  { name: "熊本県", districts: 4, blockId: "kyushu" },
  { name: "大分県", districts: 3, blockId: "kyushu" },
  { name: "宮崎県", districts: 3, blockId: "kyushu" },
  { name: "鹿児島県", districts: 4, blockId: "kyushu" },
  { name: "沖縄県", districts: 4, blockId: "kyushu" },
];

/** 289小選挙区を全国順で列挙（例: 北海道1区 … 沖縄県4区） */
export function allDistricts(): { id: string; name: string; pref: string; blockId: string }[] {
  const out: { id: string; name: string; pref: string; blockId: string }[] = [];
  for (const p of PREFS) {
    for (let i = 1; i <= p.districts; i++) {
      out.push({ id: `${p.name}${i}区`, name: `${p.name}第${i}区`, pref: p.name, blockId: p.blockId });
    }
  }
  return out;
}

export type Party = { id: string; name: string; color: string };

/** 10党（ありきたりな党名・2026-10-10確定） */
export const PARTIES: Party[] = [
  { id: "jiyuu", name: "自由党", color: "#3b82f6" },
  { id: "minshu", name: "民主党", color: "#ef4444" },
  { id: "kyowa", name: "共和党", color: "#f97316" },
  { id: "hoshu", name: "保守党", color: "#0ea5e9" },
  { id: "shakai", name: "社会党", color: "#ec4899" },
  { id: "kyosan", name: "共産党", color: "#991b1b" },
  { id: "kokumin", name: "国民党", color: "#22c55e" },
  { id: "kaikaku", name: "改革党", color: "#eab308" },
  { id: "mirai", name: "未来党", color: "#8b5cf6" },
  { id: "heiwa", name: "平和党", color: "#14b8a6" },
];
