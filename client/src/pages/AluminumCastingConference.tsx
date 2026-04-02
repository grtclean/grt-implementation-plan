/**
 * 铝铸件行业大会 — CEO 25分钟主题演讲
 * Route: /conference/aluminum-casting (STANDALONE)
 *
 * 内容数据: client/src/config/conference/aluminum-casting.ts
 * 更新演讲内容只需修改数据文件，无需改此组件。
 */

import IndustryConference from "@/components/IndustryConference";
import { aluminumCastingConfig } from "@/config/conference";

export default function AluminumCastingConference() {
  return <IndustryConference config={aluminumCastingConfig} />;
}
