import { to2chResponse } from "@/lib/bbs2ch";

export const dynamic = "force-dynamic";

const SETTINGS = `BBS_TITLE=ツイッタラー世論調査（人物）
BBS_TITLE_ORIG=ツイッタラー世論調査（人物）
BBS_NONAME_NAME=名無しさん
BBS_MAX_MENU_THREAD=1000
BBS_THREAD_TATESUGI=50
BBS_RES_MAX=1000
BBS_MESSAGE_COUNT=4096
BBS_LINE_NUMBER=200
BBS_SUBJECT_COUNT=200
BBS_NAME_COUNT=64
BBS_MAIL_COUNT=64
BBS_UNICODE=pass
BBS_FORCE_ID=checked
BBS_DEFAULT_NAME=名無しさん
BBS_NAMECOOKIE=checked
BBS_MAILCOOKIE=checked
BBS_AA=checked
BBS_MARU=checked
`;

export async function GET() {
  return to2chResponse(SETTINGS, 300);
}
