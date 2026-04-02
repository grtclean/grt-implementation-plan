/**
 * Conference Data Registry
 *
 * 所有行业大会演讲数据的统一入口。
 * 新增行业: 1) 创建 <slug>.ts  2) 在此注册  3) 创建页面 wrapper
 *
 * 更新已有行业的内容: 直接修改对应的 .ts 文件，无需改任何组件代码。
 */

export { gearShaftConfig } from "./gear-shaft";
export { aluminumCastingConfig } from "./aluminum-casting";
export { engineBlockConfig } from "./engine-block";
export { injectionSystemConfig } from "./injection-system";

export type { ConferenceConfig, Slide, SlideLayout, ConferenceMeta } from "@/components/IndustryConference";
