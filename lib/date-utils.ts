import { format as dateFnsFormat } from 'date-fns';

/**
 * UTC文字列を日本時間（JST）に変換してフォーマット
 * @param utcDateString - UTC形式の日時文字列
 * @param formatString - date-fnsのフォーマット文字列
 * @returns フォーマットされた日本時間の文字列
 */
export function formatJST(utcDateString: string, formatString: string): string {
  const date = new Date(utcDateString);
  
  // UTC時間からJST（UTC+9）に変換
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  
  return dateFnsFormat(jstDate, formatString);
}
