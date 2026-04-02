/**
 * 喷射系统行业大会 — CEO 25分钟主题演讲
 * Route: /conference/injection-system (STANDALONE)
 *
 * 内容数据: client/src/config/conference/injection-system.ts
 * 更新演讲内容只需修改数据文件，无需改此组件。
 */

import IndustryConference from "@/components/IndustryConference";
import { injectionSystemConfig } from "@/config/conference";

export default function InjectionSystemConference() {
  return <IndustryConference config={injectionSystemConfig} />;
}
