import { format as dateFnsFormat } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/**
 * UTC文字列を日本時間（JST）に変換してフォーマット
 * @param utcDateString - UTC形式の日時文字列
 * @param formatString - date-fnsのフォーマット文字列
 * @returns フォーマットされた日本時間の文字列
 */
export function formatJST(utcDateString: string, formatString: string): string {
  const date = new Date(utcDateString);
  
  // 正確な日本時間（JST）に変換
  const jstDate = toZonedTime(date, 'Asia/Tokyo');
  
  return dateFnsFormat(jstDate, formatString);
}
