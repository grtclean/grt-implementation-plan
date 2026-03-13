/**
 * Seed Payroll Structures — Real Employee Data from CEO's January 2026 Excel
 *
 * Data source: 副本202602-薪资稿V1 (无密码).xlsx + cash-subsidy.csv + travel-car-subsidy-202601.csv
 *
 * Populates:
 *   1. salary_structures — ALL employees with EXACT Excel values
 *   2. attendance_records — January 2026 from Excel
 *   3. performance_evaluations — January 2026 scores
 *   4. payroll_access_control — initial CEO/CFO/HR-head access
 *
 * Usage: npx tsx scripts/seed-payroll-structures.ts
 */

import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// ── Real Salary Data from CEO Excel ──────────────────────
// Format: [name, dept, grade, baseSalary, positionWage, skillSubsidy, perfWage1Base, perfWage2Base, perfWage3Base,
//          saturdayShiftPremium, comprehensiveSalary, isLumpSum, socialInsuranceActual, housingFundActual,
//          cashSubsidy, perfectAttendanceEligible,
//          // Attendance: scheduledDays, personalLeaveHours, sickLeaveHours, weekdayOTHours, weekendOTHours, holidayOTHours, perfectAttendanceBonus,
//          // Performance: avg2024, avg2025, monthlyScore]

interface SalaryRow {
  name: string; dept: string; grade: string;
  base: number; posWage: number; skill: number;
  pw1: number; pw2: number; pw3: number;
  satPrem: number; comp: number; lumpSum: boolean;
  siActual: number; hfActual: number; cash: number;
  perfAttend: boolean;
  // Attendance Jan 2026
  sched: number; plHours: number; slHours: number;
  wdOT: number; weOT: number; holOT: number; attBonus: number;
  // Performance
  avg24: number; avg25: number; score: number;
  // Verification
  netPay: number;
}

const D: SalaryRow[] = [
  // 1. 倪亚东 (CEO)
  { name:"倪亚东", dept:"总经办", grade:"", base:0, posWage:0, skill:0, pw1:0, pw2:0, pw3:0, satPrem:0, comp:35000, lumpSum:true, siActual:743.72, hfActual:3520, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:0, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:29086.11 },
  // 2. 倪微薇
  { name:"倪微薇", dept:"总经办", grade:"", base:0, posWage:0, skill:0, pw1:0, pw2:0, pw3:0, satPrem:0, comp:20000, lumpSum:true, siActual:0, hfActual:0, cash:0, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:0, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:19550 },
  // 3. 曹二
  { name:"曹二", dept:"运营部", grade:"12A", base:4640, posWage:10000, skill:14983, pw1:0, pw2:3500, pw3:0, satPrem:1877, comp:35000, lumpSum:false, siActual:1575, hfActual:0, cash:0, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:0, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:28567.75 },
  // 4. 杨勇
  { name:"杨勇", dept:"总经办", grade:"11B", base:4640, posWage:10000, skill:10483, pw1:3000, pw2:2100, pw3:0, satPrem:1877, comp:32100, lumpSum:false, siActual:1575, hfActual:1500, cash:300, perfAttend:false, sched:17, plHours:5, slHours:0, wdOT:-0.5, weOT:0, holOT:0, attBonus:0, avg24:60, avg25:80, score:0, netPay:23132.55 },
  // 5. 刘奥运
  { name:"刘奥运", dept:"总经办", grade:"8", base:4640, posWage:2000, skill:5783, pw1:0, pw2:2700, pw3:0, satPrem:1877, comp:17000, lumpSum:false, siActual:630, hfActual:600, cash:525, perfAttend:false, sched:17, plHours:48, slHours:0, wdOT:30, weOT:5.5, holOT:8, attBonus:0, avg24:0, avg25:80, score:0, netPay:13019.08 },
  // 6. 李柯瑶
  { name:"李柯瑶", dept:"销售部", grade:"", base:2490, posWage:0, skill:2443, pw1:0, pw2:0, pw3:0, satPrem:1007, comp:5940, lumpSum:false, siActual:519.96, hfActual:249, cash:200, perfAttend:false, sched:17, plHours:34.5, slHours:0, wdOT:14, weOT:17.5, holOT:0, attBonus:0, avg24:0, avg25:75, score:0, netPay:5218.91 },
  // 7. 沙建梅
  { name:"沙建梅", dept:"人事行政部", grade:"8", base:4640, posWage:2000, skill:3183, pw1:0, pw2:1300, pw3:0, satPrem:1877, comp:13000, lumpSum:false, siActual:840, hfActual:800, cash:500, perfAttend:false, sched:17, plHours:0, slHours:33.5, wdOT:35.5, weOT:5.5, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:11035.84 },
  // 8. 田炜钰
  { name:"田炜钰", dept:"人事行政部", grade:"4", base:4640, posWage:0, skill:0, pw1:0, pw2:0, pw3:0, satPrem:1877, comp:6517, lumpSum:false, siActual:519.96, hfActual:266, cash:700, perfAttend:false, sched:17, plHours:19, slHours:1.5, wdOT:0, weOT:3.5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:4840.65 },
  // 9. 朱宇浩
  { name:"朱宇浩", dept:"数智部", grade:"8", base:4640, posWage:0, skill:683, pw1:0, pw2:800, pw3:0, satPrem:1877, comp:8000, lumpSum:false, siActual:519.96, hfActual:249, cash:2700, perfAttend:false, sched:17, plHours:2, slHours:0, wdOT:45.5, weOT:24.5, holOT:0, attBonus:0, avg24:82, avg25:82, score:0, netPay:9167.86 },
  // 10. 胡杨
  { name:"胡杨", dept:"数智部", grade:"8", base:4640, posWage:0, skill:3833, pw1:0, pw2:1080, pw3:0, satPrem:1877, comp:11430, lumpSum:false, siActual:519.96, hfActual:249, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:38, weOT:11, holOT:0, attBonus:0, avg24:78, avg25:82, score:0, netPay:11422.49 },
  // 11. 朱文韬
  { name:"朱文韬", dept:"数智部", grade:"4", base:4640, posWage:0, skill:2160, pw1:0, pw2:0, pw3:0, satPrem:0, comp:6800, lumpSum:false, siActual:519.96, hfActual:266, cash:500, perfAttend:false, sched:17, plHours:8, slHours:0, wdOT:19.5, weOT:23, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:7371.77 },
  // 12. 黄晓兰
  { name:"黄晓兰", dept:"财务部", grade:"", base:0, posWage:0, skill:0, pw1:0, pw2:0, pw3:0, satPrem:0, comp:35000, lumpSum:true, siActual:1260, hfActual:3520, cash:0, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:0, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:30167.05 },
  // 13. 王秀萍
  { name:"王秀萍", dept:"财务部", grade:"7", base:4640, posWage:2000, skill:1983, pw1:0, pw2:811, pw3:0, satPrem:1877, comp:11311, lumpSum:false, siActual:630, hfActual:600, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:4, weOT:0, holOT:0, attBonus:0, avg24:81.75, avg25:85, score:0, netPay:9370.45 },
  // 14. 王汝月
  { name:"王汝月", dept:"财务部", grade:"4", base:4500, posWage:0, skill:0, pw1:0, pw2:0, pw3:0, satPrem:1820, comp:6320, lumpSum:false, siActual:519.96, hfActual:266, cash:500, perfAttend:false, sched:17, plHours:16, slHours:0, wdOT:19.5, weOT:2, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:5491.88 },
  // 15. 马康风
  { name:"马康风", dept:"仓库", grade:"5", base:3480, posWage:0, skill:1916, pw1:0, pw2:700, pw3:0, satPrem:1408, comp:7504, lumpSum:false, siActual:519.96, hfActual:249, cash:525, perfAttend:false, sched:17, plHours:48, slHours:0, wdOT:18, weOT:4.5, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:5289.84 },
  // 16. 季蔚正
  { name:"季蔚正", dept:"仓库", grade:"5", base:3000, posWage:0, skill:2786, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:7000, lumpSum:false, siActual:586.22, hfActual:266, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:16, weOT:1, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6578.17 },
  // 17. 沈迎凤
  { name:"沈迎凤", dept:"采购部", grade:"10B", base:4640, posWage:8000, skill:7483, pw1:0, pw2:2112, pw3:0, satPrem:1877, comp:24112, lumpSum:false, siActual:1050, hfActual:1000, cash:500, perfAttend:false, sched:17, plHours:1.5, slHours:0, wdOT:5, weOT:0, holOT:0, attBonus:0, avg24:83.8, avg25:85, score:0, netPay:19802.30 },
  // 18. 倪亚琴
  { name:"倪亚琴", dept:"采购部", grade:"5", base:3480, posWage:0, skill:2484, pw1:369, pw2:743, pw3:0, satPrem:1408, comp:8484, lumpSum:false, siActual:612.47, hfActual:249, cash:600, perfAttend:false, sched:17, plHours:0.5, slHours:0, wdOT:6, weOT:1, holOT:0, attBonus:0, avg24:82, avg25:85, score:0, netPay:6691.07 },
  // 19. 张洵
  { name:"张洵", dept:"采购部", grade:"7", base:3480, posWage:2000, skill:3112, pw1:500, pw2:1617, pw3:0, satPrem:1408, comp:12117, lumpSum:false, siActual:612.47, hfActual:249, cash:600, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:8, weOT:0, holOT:0, attBonus:0, avg24:83.04, avg25:85, score:0, netPay:9378.53 },
  // 20. 滕顺英
  { name:"滕顺英", dept:"采购部", grade:"5", base:3480, posWage:0, skill:2612, pw1:0, pw2:900, pw3:0, satPrem:1408, comp:8400, lumpSum:false, siActual:519.96, hfActual:249, cash:400, perfAttend:false, sched:17, plHours:14.5, slHours:0, wdOT:0, weOT:0, holOT:0, attBonus:0, avg24:82.97, avg25:85, score:0, netPay:6245.16 },
  // 21. 戴晓燕
  { name:"戴晓燕", dept:"销售部", grade:"10C", base:4640, posWage:8000, skill:5931, pw1:3067, pw2:1800, pw3:0, satPrem:1877, comp:25315, lumpSum:false, siActual:612.47, hfActual:600, cash:500, perfAttend:false, sched:17, plHours:5, slHours:0, wdOT:16, weOT:5.5, holOT:0, attBonus:0, avg24:45.13, avg25:75, score:0, netPay:19564.80 },
  // 22. 冯艳
  { name:"冯艳", dept:"销售部", grade:"7", base:3480, posWage:2000, skill:4305, pw1:0, pw2:0, pw3:0, satPrem:1408, comp:11193, lumpSum:false, siActual:612.47, hfActual:249, cash:0, perfAttend:false, sched:17, plHours:12.5, slHours:0, wdOT:21, weOT:1, holOT:0, attBonus:0, avg24:57.26, avg25:75, score:0, netPay:10529.74 },
  // 23. 王志强
  { name:"王志强", dept:"销售部", grade:"7", base:3480, posWage:2000, skill:4728, pw1:0, pw2:1028, pw3:0, satPrem:1408, comp:12644, lumpSum:false, siActual:519.96, hfActual:249, cash:2000, perfAttend:false, sched:17, plHours:16, slHours:0, wdOT:22.5, weOT:22, holOT:0, attBonus:0, avg24:42.62, avg25:75, score:0, netPay:12651.54 },
  // 24. 韩保程
  { name:"韩保程", dept:"销售部", grade:"6", base:3480, posWage:0, skill:5672, pw1:0, pw2:0, pw3:0, satPrem:1408, comp:10560, lumpSum:false, siActual:630, hfActual:600, cash:5300, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:37, weOT:2.5, holOT:0, attBonus:0, avg24:51.56, avg25:75, score:0, netPay:10196.80 },
  // 25. 董纾雨
  { name:"董纾雨", dept:"销售部", grade:"5", base:3480, posWage:0, skill:3112, pw1:0, pw2:0, pw3:0, satPrem:1408, comp:6118, lumpSum:false, siActual:525, hfActual:500, cash:500, perfAttend:false, sched:13, plHours:30, slHours:0, wdOT:3, weOT:3.5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:4422.65 },
  // 26. 刘健康
  { name:"刘健康", dept:"海外事业部", grade:"9A", base:4640, posWage:4000, skill:4783, pw1:0, pw2:3700, pw3:0, satPrem:1877, comp:19000, lumpSum:false, siActual:1050, hfActual:1000, cash:5000, perfAttend:false, sched:17, plHours:49, slHours:0, wdOT:48, weOT:15, holOT:0, attBonus:0, avg24:62, avg25:75, score:0, netPay:12942.50 },
  // 27. 刘坤
  { name:"刘坤", dept:"海外事业部", grade:"8", base:4640, posWage:8000, skill:2210, pw1:0, pw2:1650, pw3:0, satPrem:0, comp:16500, lumpSum:false, siActual:1050, hfActual:1000, cash:300, perfAttend:false, sched:17, plHours:24, slHours:0, wdOT:16.5, weOT:25, holOT:0, attBonus:0, avg24:0, avg25:75, score:0, netPay:13559.33 },
  // 28. 金晓锋
  { name:"金晓锋", dept:"制造部", grade:"9B", base:4640, posWage:8000, skill:3476, pw1:1292, pw2:2143, pw3:0, satPrem:1877, comp:21428, lumpSum:false, siActual:612.47, hfActual:0, cash:1200, perfAttend:false, sched:17, plHours:1, slHours:0, wdOT:9, weOT:8, holOT:0, attBonus:0, avg24:65.89, avg25:77, score:0, netPay:17769.39 },
  // 29. 马柯
  { name:"马柯", dept:"制造部", grade:"4", base:2600, posWage:0, skill:2754, pw1:0, pw2:0, pw3:0, satPrem:1052, comp:6406, lumpSum:false, siActual:612.47, hfActual:249, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:14.5, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:5869.53 },
  // 30. 黄潇潇
  { name:"黄潇潇", dept:"制造部", grade:"2", base:2600, posWage:0, skill:848, pw1:0, pw2:0, pw3:0, satPrem:1052, comp:4500, lumpSum:false, siActual:519.96, hfActual:0, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:9, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:4181.76 },
  // 31. 张腾飞
  { name:"张腾飞", dept:"前道生产-机加工", grade:"6", base:4000, posWage:2000, skill:1222, pw1:0, pw2:434, pw3:0, satPrem:1618, comp:9274, lumpSum:false, siActual:612.47, hfActual:249, cash:1200, perfAttend:true, sched:17, plHours:0, slHours:0, wdOT:23.5, weOT:14, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:10613.55 },
  // 32. 李树锋
  { name:"李树锋", dept:"前道生产-机加工", grade:"3", base:3000, posWage:0, skill:2286, pw1:0, pw2:985, pw3:0, satPrem:1214, comp:7485, lumpSum:false, siActual:519.96, hfActual:0, cash:2500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:7, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:7146.20 },
  // 33. 李亚超
  { name:"李亚超", dept:"前道生产-机加工", grade:"3", base:3000, posWage:0, skill:2286, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:6500, lumpSum:false, siActual:519.96, hfActual:0, cash:500, perfAttend:false, sched:17, plHours:16, slHours:0, wdOT:0.5, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:5546.93 },
  // 34. 李鹏飞
  { name:"李鹏飞", dept:"前道生产-机加工", grade:"3", base:3000, posWage:0, skill:1786, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:6000, lumpSum:false, siActual:519.96, hfActual:0, cash:300, perfAttend:false, sched:17, plHours:40, slHours:0, wdOT:2, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:4497.28 },
  // 35. 毛洪飞
  { name:"毛洪飞", dept:"前道生产-机加工", grade:"3", base:3000, posWage:0, skill:2286, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:2294, lumpSum:false, siActual:519.96, hfActual:0, cash:300, perfAttend:false, sched:6, plHours:0, slHours:0, wdOT:0.5, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:1787.09 },
  // 36. 范威
  { name:"范威", dept:"前道生产-机加工", grade:"3", base:3000, posWage:0, skill:2486, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:504, lumpSum:false, siActual:0, hfActual:0, cash:0, perfAttend:false, sched:2, plHours:0, slHours:0, wdOT:0, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:504.46 },
  // 37. 史龙昌
  { name:"史龙昌", dept:"前道生产-折弯", grade:"6", base:4000, posWage:2000, skill:900, pw1:0, pw2:305, pw3:0, satPrem:1618, comp:8823, lumpSum:false, siActual:612.47, hfActual:0, cash:0, perfAttend:false, sched:17, plHours:72, slHours:0, wdOT:3, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:5831.22 },
  // 38. 李兴伟
  { name:"李兴伟", dept:"前道生产-折弯", grade:"4", base:3200, posWage:0, skill:2274, pw1:0, pw2:363, pw3:0, satPrem:1295, comp:7132, lumpSum:false, siActual:612.47, hfActual:0, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:12, weOT:8.5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:7128.31 },
  // 39. 张超
  { name:"张超", dept:"前道生产-下料", grade:"4", base:2800, posWage:0, skill:2446, pw1:0, pw2:262, pw3:0, satPrem:1133, comp:6641, lumpSum:false, siActual:612.47, hfActual:0, cash:300, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:3, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6058.91 },
  // 40. 强兵兵
  { name:"强兵兵", dept:"前道生产-激光切割", grade:"3", base:3200, posWage:0, skill:3586, pw1:0, pw2:0, pw3:0, satPrem:1295, comp:8081, lumpSum:false, siActual:519.96, hfActual:0, cash:300, perfAttend:false, sched:17, plHours:33, slHours:0, wdOT:5, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6788.63 },
  // 41. 嵇国华
  { name:"嵇国华", dept:"机械装配", grade:"3", base:2800, posWage:0, skill:1867, pw1:0, pw2:315, pw3:0, satPrem:1133, comp:6115, lumpSum:false, siActual:519.96, hfActual:0, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:12, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:5843.15 },
  // 42. 匡凯旋
  { name:"匡凯旋", dept:"售后部", grade:"8A", base:4640, posWage:4000, skill:2576, pw1:1265, pw2:1214, pw3:0, satPrem:1877, comp:15572, lumpSum:false, siActual:519.96, hfActual:600, cash:200, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:4, weOT:2.5, holOT:0, attBonus:0, avg24:66.11, avg25:85, score:0, netPay:12132.38 },
  // 43. 廉龙海
  { name:"廉龙海", dept:"售后部", grade:"6", base:4000, posWage:0, skill:5205, pw1:0, pw2:518, pw3:0, satPrem:1618, comp:11341, lumpSum:false, siActual:612.47, hfActual:0, cash:6000, perfAttend:true, sched:17, plHours:0, slHours:0, wdOT:29, weOT:17.5, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:12859.14 },
  // 44. 朱明华
  { name:"朱明华", dept:"售后部", grade:"5", base:3200, posWage:0, skill:3433, pw1:0, pw2:368, pw3:0, satPrem:1295, comp:8296, lumpSum:false, siActual:519.96, hfActual:0, cash:3800, perfAttend:true, sched:17, plHours:0, slHours:0, wdOT:45.5, weOT:22, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:10165.89 },
  // 45. 张松松
  { name:"张松松", dept:"售后部", grade:"5", base:3200, posWage:0, skill:3612, pw1:0, pw2:870, pw3:0, satPrem:1295, comp:8977, lumpSum:false, siActual:612.47, hfActual:249, cash:0, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:0, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:8115.53 },
  // 46. 晏春艮
  { name:"晏春艮", dept:"售后部", grade:"6", base:4000, posWage:0, skill:3402, pw1:0, pw2:492, pw3:0, satPrem:1618, comp:9512, lumpSum:false, siActual:519.96, hfActual:0, cash:800, perfAttend:false, sched:17, plHours:0, slHours:88, wdOT:3.5, weOT:8, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:8211.06 },
  // 47. 钱佳奇
  { name:"钱佳奇", dept:"电气技术部", grade:"9A", base:4640, posWage:0, skill:9983, pw1:0, pw2:1500, pw3:0, satPrem:1877, comp:18000, lumpSum:false, siActual:945, hfActual:900, cash:1100, perfAttend:false, sched:17, plHours:20.5, slHours:0, wdOT:33, weOT:20, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:15931.22 },
  // 48. 李大鹏
  { name:"李大鹏", dept:"电气技术部", grade:"6", base:4000, posWage:0, skill:5730, pw1:1152, pw2:1175, pw3:0, satPrem:1618, comp:13675, lumpSum:false, siActual:612.47, hfActual:249, cash:800, perfAttend:false, sched:17, plHours:7.5, slHours:0, wdOT:27.5, weOT:16, holOT:0, attBonus:0, avg24:69, avg25:80, score:0, netPay:12558.87 },
  // 49. 孙国祥
  { name:"孙国祥", dept:"电气技术部", grade:"7", base:3480, posWage:2000, skill:6339, pw1:1260, pw2:1303, pw3:0, satPrem:1408, comp:15790, lumpSum:false, siActual:612.47, hfActual:500, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:17, weOT:13.5, holOT:0, attBonus:0, avg24:68.22, avg25:80, score:0, netPay:12949.59 },
  // 50. 孙坚
  { name:"孙坚", dept:"电气技术部", grade:"8A", base:3480, posWage:4000, skill:6112, pw1:1080, pw2:2354, pw3:0, satPrem:1408, comp:18434, lumpSum:false, siActual:612.47, hfActual:249, cash:5200, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:19.5, weOT:17.5, holOT:0, attBonus:0, avg24:70.56, avg25:80, score:0, netPay:15323.53 },
  // 51. 高嘉义
  { name:"高嘉义", dept:"电气技术部", grade:"5", base:4640, posWage:0, skill:983, pw1:0, pw2:600, pw3:0, satPrem:1877, comp:8100, lumpSum:false, siActual:525, hfActual:500, cash:700, perfAttend:false, sched:17, plHours:34.5, slHours:0, wdOT:-1, weOT:4, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:5239.28 },
  // 52. 梅奥杰
  { name:"梅奥杰", dept:"电气技术部", grade:"5", base:4640, posWage:0, skill:1483, pw1:0, pw2:1200, pw3:0, satPrem:1877, comp:9200, lumpSum:false, siActual:525, hfActual:500, cash:1000, perfAttend:false, sched:17, plHours:70, slHours:0, wdOT:7.5, weOT:15, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:5276.76 },
  // 53. 杜显文
  { name:"杜显文", dept:"电气技术部", grade:"5", base:3200, posWage:0, skill:1661, pw1:0, pw2:320, pw3:0, satPrem:1295, comp:6476, lumpSum:false, siActual:612.47, hfActual:0, cash:900, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:6, weOT:15.5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6524.18 },
  // 54. 杨之雲
  { name:"杨之雲", dept:"电气技术部", grade:"3", base:3000, posWage:0, skill:2056, pw1:0, pw2:357, pw3:0, satPrem:1214, comp:6627, lumpSum:false, siActual:612.47, hfActual:249, cash:1000, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:6, weOT:23.5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6649.11 },
  // 55. 殷小勇
  { name:"殷小勇", dept:"电气技术部", grade:"4", base:2800, posWage:0, skill:2787, pw1:0, pw2:282, pw3:0, satPrem:1133, comp:7002, lumpSum:false, siActual:519.96, hfActual:0, cash:600, perfAttend:true, sched:17, plHours:0, slHours:0, wdOT:32, weOT:40, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:8708.55 },
  // 56. 韩品来
  { name:"韩品来", dept:"电气技术部", grade:"3", base:3000, posWage:0, skill:1486, pw1:0, pw2:239, pw3:0, satPrem:1214, comp:1304, lumpSum:false, siActual:519.96, hfActual:0, cash:0, perfAttend:true, sched:7, plHours:0, slHours:0, wdOT:17.5, weOT:25.5, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:2595.45 },
  // 57. 吕雪冬
  { name:"吕雪冬", dept:"电气技术部", grade:"5", base:3200, posWage:0, skill:3105, pw1:0, pw2:348, pw3:0, satPrem:1295, comp:7948, lumpSum:false, siActual:519.96, hfActual:0, cash:600, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:5, weOT:6, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:8170.06 },
  // 58. 崔聪聪
  { name:"崔聪聪", dept:"电气技术部", grade:"3", base:3000, posWage:0, skill:2286, pw1:0, pw2:300, pw3:0, satPrem:1214, comp:6800, lumpSum:false, siActual:519.96, hfActual:0, cash:1000, perfAttend:false, sched:17, plHours:16, slHours:0, wdOT:9, weOT:8, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6362.03 },
  // 59. 刘琛杨
  { name:"刘琛杨", dept:"电气技术部", grade:"3", base:3000, posWage:0, skill:1986, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:6200, lumpSum:false, siActual:519.96, hfActual:0, cash:800, perfAttend:false, sched:17, plHours:8, slHours:0, wdOT:7.5, weOT:25, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6781.41 },
  // 60. 赵铖杰
  { name:"赵铖杰", dept:"电气技术部", grade:"3", base:2800, posWage:0, skill:1067, pw1:0, pw2:0, pw3:0, satPrem:1133, comp:5000, lumpSum:false, siActual:519.96, hfActual:0, cash:600, perfAttend:true, sched:17, plHours:0, slHours:0, wdOT:23.5, weOT:25.5, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:6114.93 },
  // 61. 陈武鸣
  { name:"陈武鸣", dept:"电气技术部", grade:"3", base:3000, posWage:0, skill:1486, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:1341, lumpSum:false, siActual:0, hfActual:0, cash:0, perfAttend:false, sched:4, plHours:0, slHours:0, wdOT:0, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:1341.18 },
  // 62. 殷金刚
  { name:"殷金刚", dept:"机械设计", grade:"", base:4640, posWage:5000, skill:4033, pw1:0, pw2:1200, pw3:0, satPrem:1877, comp:16750, lumpSum:false, siActual:840, hfActual:800, cash:500, perfAttend:false, sched:17, plHours:24, slHours:0, wdOT:7.5, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:13017.50 },
  // 63. 徐树奎
  { name:"徐树奎", dept:"机械设计", grade:"12A", base:4640, posWage:8000, skill:2360, pw1:0, pw2:5000, pw3:0, satPrem:10000, comp:30000, lumpSum:false, siActual:1575, hfActual:1500, cash:500, perfAttend:false, sched:17, plHours:25, slHours:0, wdOT:18.5, weOT:7.5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:24937.75 },
  // 64. 曹庆伟
  { name:"曹庆伟", dept:"机械装配", grade:"3", base:3200, posWage:0, skill:1830, pw1:0, pw2:287, pw3:0, satPrem:1295, comp:6612, lumpSum:false, siActual:612.47, hfActual:0, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:10, weOT:3.5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6404.13 },
  // 65. 肖博雅
  { name:"肖博雅", dept:"机械装配", grade:"6", base:4500, posWage:0, skill:3654, pw1:0, pw2:499, pw3:0, satPrem:1821, comp:10474, lumpSum:false, siActual:612.47, hfActual:0, cash:0, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:12, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:10257.24 },
  // 66. 赵强
  { name:"赵强", dept:"机械装配", grade:"4", base:3200, posWage:0, skill:3505, pw1:0, pw2:386, pw3:0, satPrem:1295, comp:8386, lumpSum:false, siActual:519.96, hfActual:0, cash:2200, perfAttend:false, sched:17, plHours:17, slHours:0, wdOT:16.5, weOT:16, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:8349.81 },
  // 67. 杨会龙
  { name:"杨会龙", dept:"机械装配", grade:"3", base:3000, posWage:0, skill:2786, pw1:0, pw2:350, pw3:0, satPrem:1214, comp:7350, lumpSum:false, siActual:519.96, hfActual:0, cash:0, perfAttend:false, sched:17, plHours:28, slHours:0, wdOT:22.5, weOT:3.5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6754.43 },
  // 68. 吴周祥
  { name:"吴周祥", dept:"机械装配", grade:"3", base:3000, posWage:0, skill:2286, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:6500, lumpSum:false, siActual:519.96, hfActual:0, cash:500, perfAttend:false, sched:17, plHours:56, slHours:0, wdOT:12, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:4832.04 },
  // 69. 洪香龙
  { name:"洪香龙", dept:"机械设计", grade:"10B", base:4640, posWage:10100, skill:4383, pw1:0, pw2:4200, pw3:0, satPrem:1877, comp:25200, lumpSum:false, siActual:612.47, hfActual:249, cash:900, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:23, weOT:13.5, holOT:0, attBonus:0, avg24:51.87, avg25:80, score:0, netPay:23278.18 },
  // 70. 陈加丽
  { name:"陈加丽", dept:"机械设计", grade:"6", base:4640, posWage:0, skill:4360, pw1:0, pw2:1305, pw3:0, satPrem:1877, comp:12182, lumpSum:false, siActual:525, hfActual:500, cash:1200, perfAttend:false, sched:17, plHours:41, slHours:0, wdOT:10.5, weOT:10, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:10270.22 },
  // 71. 田坪珍
  { name:"田坪珍", dept:"机械装配", grade:"5", base:3000, posWage:0, skill:3294, pw1:0, pw2:375, pw3:0, satPrem:1214, comp:7883, lumpSum:false, siActual:612.47, hfActual:0, cash:900, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:15, weOT:16, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:8086.88 },
  // 72. 焦斌
  { name:"焦斌", dept:"机械装配", grade:"4", base:3200, posWage:0, skill:3086, pw1:0, pw2:221, pw3:0, satPrem:1295, comp:7802, lumpSum:false, siActual:519.96, hfActual:0, cash:5800, perfAttend:false, sched:17, plHours:32, slHours:0, wdOT:26, weOT:14, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:7378.52 },
  // 73. 曹滟林
  { name:"曹滟林", dept:"机械装配", grade:"5", base:3200, posWage:0, skill:4205, pw1:0, pw2:332, pw3:0, satPrem:1295, comp:9032, lumpSum:false, siActual:519.96, hfActual:0, cash:3700, perfAttend:false, sched:17, plHours:16, slHours:0, wdOT:19.5, weOT:9, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:9195.43 },
  // 74. 胡绍杰
  { name:"胡绍杰", dept:"机械装配", grade:"3", base:3000, posWage:0, skill:2286, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:6500, lumpSum:false, siActual:519.96, hfActual:0, cash:200, perfAttend:false, sched:17, plHours:60.5, slHours:0, wdOT:10, weOT:5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:4845.22 },
  // 75. 王犇
  { name:"王犇", dept:"机械装配", grade:"3", base:3000, posWage:0, skill:2286, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:6500, lumpSum:false, siActual:519.96, hfActual:0, cash:700, perfAttend:false, sched:17, plHours:16, slHours:0, wdOT:13, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:5854.59 },
  // 76. 谈宜磊
  { name:"谈宜磊", dept:"机械装配", grade:"4", base:3000, posWage:0, skill:3786, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:8000, lumpSum:false, siActual:519.96, hfActual:0, cash:500, perfAttend:true, sched:17, plHours:16, slHours:0, wdOT:24, weOT:15, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:8500.46 },
  // 77. 蒋秋瑞
  { name:"蒋秋瑞", dept:"机械装配", grade:"4", base:3000, posWage:0, skill:2586, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:6800, lumpSum:false, siActual:519.96, hfActual:266, cash:700, perfAttend:true, sched:17, plHours:51, slHours:0, wdOT:20.5, weOT:15.5, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:6322.93 },
  // 78. 蔡瑞
  { name:"蔡瑞", dept:"机械设计", grade:"9C", base:4640, posWage:6000, skill:7283, pw1:0, pw2:2200, pw3:0, satPrem:1877, comp:6476, lumpSum:false, siActual:945, hfActual:0, cash:0, perfAttend:false, sched:8, plHours:0, slHours:0, wdOT:6.5, weOT:8, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:4438.04 },
  // 79. 吴卫成
  { name:"吴卫成", dept:"机械装配", grade:"6", base:4000, posWage:2000, skill:1502, pw1:0, pw2:317, pw3:0, satPrem:1618, comp:9437, lumpSum:false, siActual:612.47, hfActual:0, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:16, weOT:11, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:10250.54 },
  // 80. 刘建年
  { name:"刘建年", dept:"机械装配", grade:"4", base:3500, posWage:0, skill:2584, pw1:0, pw2:930, pw3:0, satPrem:1416, comp:8430, lumpSum:false, siActual:519.96, hfActual:0, cash:200, perfAttend:true, sched:17, plHours:0, slHours:0, wdOT:24.5, weOT:16, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:9740.16 },
  // 81. 侯德朋
  { name:"侯德朋", dept:"机械装配", grade:"4", base:3000, posWage:0, skill:2866, pw1:0, pw2:281, pw3:0, satPrem:1214, comp:7361, lumpSum:false, siActual:519.96, hfActual:0, cash:200, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:18, weOT:8.5, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:8737.87 },
  // 82. 纪伟
  { name:"纪伟", dept:"机械装配", grade:"5", base:4060, posWage:0, skill:2497, pw1:0, pw2:467, pw3:0, satPrem:1643, comp:8667, lumpSum:false, siActual:519.96, hfActual:0, cash:300, perfAttend:false, sched:17, plHours:24, slHours:0, wdOT:13.5, weOT:7, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:8004.03 },
  // 83. 周建华
  { name:"周建华", dept:"机械装配", grade:"4", base:3000, posWage:0, skill:2786, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:7000, lumpSum:false, siActual:519.96, hfActual:0, cash:500, perfAttend:true, sched:17, plHours:0, slHours:16, wdOT:33.5, weOT:11, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:7966.97 },
  // 84. 周辉
  { name:"周辉", dept:"机械设计", grade:"10C", base:4640, posWage:8000, skill:12483, pw1:3000, pw2:1500, pw3:0, satPrem:1877, comp:31500, lumpSum:false, siActual:1050, hfActual:1000, cash:1200, perfAttend:false, sched:17, plHours:14.5, slHours:0, wdOT:20.5, weOT:0, holOT:0, attBonus:0, avg24:58.93, avg25:80, score:0, netPay:27684.10 },
  // 85. 罗小玲
  { name:"罗小玲", dept:"机械设计", grade:"5", base:4640, posWage:0, skill:1483, pw1:0, pw2:960, pw3:0, satPrem:1877, comp:8960, lumpSum:false, siActual:525, hfActual:500, cash:2900, perfAttend:false, sched:17, plHours:48.5, slHours:0, wdOT:13, weOT:3.5, holOT:0, attBonus:0, avg24:0, avg25:80, score:0, netPay:5632.42 },
  // 86. 洪小东
  { name:"洪小东", dept:"机械设计", grade:"7", base:3480, posWage:2000, skill:6520, pw1:1200, pw2:730, pw3:0, satPrem:1408, comp:15338, lumpSum:false, siActual:630, hfActual:600, cash:500, perfAttend:false, sched:17, plHours:1, slHours:0, wdOT:4.5, weOT:5.5, holOT:0, attBonus:0, avg24:65.28, avg25:80, score:0, netPay:12382.91 },
  // 87. 马林山
  { name:"马林山", dept:"机械装配", grade:"7", base:4000, posWage:2000, skill:3182, pw1:0, pw2:480, pw3:0, satPrem:1618, comp:11280, lumpSum:false, siActual:519.96, hfActual:249, cash:3800, perfAttend:true, sched:17, plHours:0, slHours:0, wdOT:25, weOT:19.5, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:12758.57 },
  // 88. 张良
  { name:"张良", dept:"机械装配", grade:"4", base:3200, posWage:0, skill:1823, pw1:0, pw2:267, pw3:0, satPrem:1295, comp:6585, lumpSum:false, siActual:519.96, hfActual:0, cash:700, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:16, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6506.42 },
  // 89. 孙淼
  { name:"孙淼", dept:"机械装配", grade:"4", base:3200, posWage:0, skill:2325, pw1:0, pw2:696, pw3:0, satPrem:1295, comp:7516, lumpSum:false, siActual:612.47, hfActual:0, cash:700, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:15, weOT:7, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:7476.54 },
  // 90. 谈龙锐
  { name:"谈龙锐", dept:"机械装配", grade:"3", base:3200, posWage:0, skill:1931, pw1:0, pw2:326, pw3:0, satPrem:1295, comp:6752, lumpSum:false, siActual:519.96, hfActual:0, cash:700, perfAttend:true, sched:17, plHours:0, slHours:0, wdOT:26.5, weOT:16.5, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:8425.57 },
  // 91. 陈成成
  { name:"陈成成", dept:"机械装配", grade:"4", base:3500, posWage:0, skill:2784, pw1:0, pw2:591, pw3:0, satPrem:1416, comp:8291, lumpSum:false, siActual:519.96, hfActual:0, cash:500, perfAttend:true, sched:17, plHours:0, slHours:0, wdOT:22, weOT:14.5, holOT:0, attBonus:300, avg24:0, avg25:0, score:0, netPay:9278.52 },
  // 92. 王金涛
  { name:"王金涛", dept:"机械装配", grade:"3", base:3200, posWage:0, skill:2005, pw1:0, pw2:0, pw3:0, satPrem:1295, comp:6500, lumpSum:false, siActual:519.96, hfActual:0, cash:700, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:15, weOT:7, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:6640.76 },
  // 93. 张飞
  { name:"张飞", dept:"机械装配", grade:"3", base:3000, posWage:0, skill:1486, pw1:0, pw2:0, pw3:0, satPrem:1214, comp:2982, lumpSum:false, siActual:519.96, hfActual:0, cash:200, perfAttend:false, sched:15, plHours:16, slHours:0, wdOT:9, weOT:16, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:2832.89 },
  // 94. 段天珠
  { name:"段天珠", dept:"人事行政部", grade:"2", base:2280, posWage:0, skill:98, pw1:0, pw2:0, pw3:0, satPrem:922, comp:3300, lumpSum:false, siActual:0, hfActual:0, cash:500, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:13, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:4034.00 },
  // 95. 林中风
  { name:"林中风", dept:"人事行政部", grade:"2", base:0, posWage:0, skill:0, pw1:0, pw2:0, pw3:0, satPrem:0, comp:0, lumpSum:false, siActual:0, hfActual:0, cash:500, perfAttend:false, sched:0, plHours:0, slHours:0, wdOT:3, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:1404.00 },
  // 96. 王爱云
  { name:"王爱云", dept:"人事行政部", grade:"2", base:2280, posWage:0, skill:1298, pw1:0, pw2:0, pw3:0, satPrem:922, comp:4500, lumpSum:false, siActual:0, hfActual:0, cash:300, perfAttend:false, sched:17, plHours:0, slHours:0, wdOT:13, weOT:0, holOT:0, attBonus:0, avg24:0, avg25:0, score:0, netPay:4753.86 },
];

// ── Department → BU mapping ─────────────────────────────
const deptToBU: Record<string, string> = {
  "总经办": "HQ", "运营部": "HQ", "财务部": "FINANCE", "人事行政部": "HR", "数智部": "IT",
  "采购部": "SUPPLY", "销售部": "SALES", "售后部": "SERVICE", "仓库": "LOGISTICS",
  "海外事业部": "OVERSEAS", "制造部": "MFG", "电气技术部": "ELEC", "机械设计": "MECH",
  "机械装配": "MECH_ASSY", "前道生产-机加工": "MFG_MACH", "前道生产-折弯": "MFG_BEND",
  "前道生产-下料": "MFG_CUT", "前道生产-激光切割": "MFG_LASER",
};

async function main() {
  const connStr = process.env.DATABASE_URL;
  if (!connStr) { console.error("DATABASE_URL not set"); process.exit(1); }

  const Pool = pg.Pool || (pg as any).default?.Pool;
  const pool = new Pool({ connectionString: connStr });

  try {
    // ── 1. Look up user IDs by name ─────────────────────
    const userRows = await pool.query(
      `SELECT id, name FROM users WHERE name NOT LIKE '[已停用]%' AND name NOT LIKE '[重复]%'`
    );
    const nameToUserId: Record<string, number> = {};
    for (const r of userRows.rows) nameToUserId[r.name] = r.id;
    console.log(`Found ${Object.keys(nameToUserId).length} users\n`);

    // ── 2. Clear existing data for re-seed ──────────────
    await pool.query(`DELETE FROM salary_structures WHERE effective_from = '2026-01-01'`);
    await pool.query(`DELETE FROM attendance_records WHERE period = '2026-01'`);
    await pool.query(`DELETE FROM performance_evaluations WHERE period = '2026-01'`);

    // ── 3. Seed salary_structures ───────────────────────
    console.log("=== Seeding salary_structures (Excel-aligned) ===\n");
    let structCount = 0;

    for (const e of D) {
      const userId = nameToUserId[e.name];
      if (!userId) { console.log(`  SKIP ${e.name} — no user`); continue; }
      const buCode = deptToBU[e.dept] || "OTHER";
      const siBase = Math.max(4494, e.base || e.comp);

      await pool.query(`
        INSERT INTO salary_structures (
          employee_id, effective_from, base_salary,
          position_allowance, confidentiality_allowance, technical_allowance,
          seniority_allowance, meal_allowance, transport_allowance, communication_allowance,
          social_insurance_base, housing_fund_base, housing_fund_rate,
          performance_base, perf_wage1_base, perf_wage2_base, perf_wage3_base,
          position_wage, skill_subsidy, saturday_shift_premium, comprehensive_salary,
          cash_subsidy, travel_car_subsidy, is_lump_sum,
          special_tax_deduction, social_insurance_actual, housing_fund_actual,
          perfect_attendance_eligible, perfect_attendance_amount,
          position_grade, department, bu_code, remarks
        ) VALUES (
          $1, '2026-01-01', $2,
          '0', '0', '0', '0', '0', '0', '0',
          $3, $4, '0.1200',
          $5, $6, $7, $8,
          $9, $10, $11, $12,
          $13, '0', $14,
          $15, $16, $17,
          $18, $19,
          $20, $21, $22, $23
        )
        ON CONFLICT DO NOTHING
      `, [
        userId, e.base.toFixed(2),
        siBase.toFixed(2), siBase.toFixed(2),
        (e.pw1 + e.pw2 + e.pw3).toFixed(2), e.pw1.toFixed(2), e.pw2.toFixed(2), e.pw3.toFixed(2),
        e.posWage.toFixed(2), e.skill.toFixed(2), e.satPrem.toFixed(2), e.comp.toFixed(2),
        e.cash.toFixed(2), e.lumpSum,
        "0.00", e.siActual.toFixed(2), e.hfActual.toFixed(2),
        e.perfAttend, "300.00",
        e.grade || null, e.dept, buCode,
        `Excel-aligned Jan 2026. Net pay verification: ¥${e.netPay}`,
      ]);

      structCount++;
      console.log(`  ✓ ${e.name.padEnd(6)} comp=¥${e.comp} grade=${e.grade || 'N/A'} dept=${e.dept}`);
    }
    console.log(`\n✅ Seeded ${structCount} salary structures\n`);

    // ── 4. Seed attendance_records for 2026-01 ──────────
    console.log("=== Seeding attendance_records (Jan 2026 from Excel) ===\n");
    let attCount = 0;
    for (const e of D) {
      const userId = nameToUserId[e.name];
      if (!userId || e.sched === 0) continue;

      // Compute actual days: scheduledDays - (personalLeaveHours + sickLeaveHours) / 8
      const leaveDays = (e.plHours + e.slHours) / 8;
      const actualDays = Math.max(0, e.sched - leaveDays);

      await pool.query(`
        INSERT INTO attendance_records (
          employee_id, period, scheduled_days, actual_days, late_days,
          personal_leave_days, sick_leave_days,
          personal_leave_hours, sick_leave_hours,
          weekday_overtime_hours, weekend_overtime_hours, holiday_overtime_hours,
          data_source
        ) VALUES ($1, '2026-01', $2, $3, 0, $4, $5, $6, $7, $8, $9, $10, 'excel-import')
        ON CONFLICT DO NOTHING
      `, [
        userId, e.sched, actualDays.toFixed(1),
        (e.plHours / 8).toFixed(1), (e.slHours / 8).toFixed(1),
        e.plHours.toFixed(1), e.slHours.toFixed(1),
        Math.max(0, e.wdOT).toFixed(1), e.weOT.toFixed(1), e.holOT.toFixed(1),
      ]);
      attCount++;
    }
    console.log(`✅ Seeded ${attCount} attendance records\n`);

    // ── 5. Seed performance_evaluations for 2026-01 ─────
    console.log("=== Seeding performance_evaluations ===\n");
    let perfCount = 0;
    for (const e of D) {
      const userId = nameToUserId[e.name];
      if (!userId) continue;
      if (e.avg24 === 0 && e.avg25 === 0 && e.score === 0) continue; // no perf data

      await pool.query(`
        INSERT INTO performance_evaluations (
          employee_id, period, mbo_score, evaluation_grade,
          department_coefficient, individual_coefficient,
          department, business_data_snapshot
        ) VALUES ($1, '2026-01', $2, 'B', '1.0000', '1.0000', $3, $4)
        ON CONFLICT DO NOTHING
      `, [
        userId, e.score.toFixed(2), e.dept,
        JSON.stringify({ avg2024: e.avg24, avg2025: e.avg25 }),
      ]);
      perfCount++;
    }
    console.log(`✅ Seeded ${perfCount} performance evaluations\n`);

    // ── 6. Seed payroll_access_control ───────────────────
    console.log("=== Seeding payroll_access_control ===\n");
    const accessList = [
      { name: "倪亚东", grtId: "GRT001", level: "full", canViewAll: true, canApprove: true, canOverridePerf: true, canExport: true },
      { name: "刘奥运", grtId: "GRT080", level: "full", canViewAll: true, canApprove: false, canOverridePerf: false, canExport: true },
      { name: "倪微薇", grtId: "GRT105", level: "full", canViewAll: true, canApprove: true, canOverridePerf: true, canExport: true },
      { name: "黄晓兰", grtId: "GRT002", level: "department", canViewAll: false, canApprove: false, canOverridePerf: false, canExport: true },
      { name: "王秀萍", grtId: "GRT054", level: "department", canViewAll: false, canApprove: false, canOverridePerf: false, canExport: false },
      { name: "沙建梅", grtId: "GRT067", level: "department", canViewAll: false, canApprove: false, canOverridePerf: false, canExport: false },
    ];
    const ceoUserId = nameToUserId["倪亚东"];
    for (const acc of accessList) {
      const uid = nameToUserId[acc.name];
      if (!uid) { console.log(`  SKIP ${acc.name}`); continue; }
      await pool.query(`
        INSERT INTO payroll_access_control (
          user_id, employee_grt_id, employee_name, access_level,
          can_view_all, can_approve, can_override_perf, can_export,
          granted_by_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        ON CONFLICT DO NOTHING
      `, [uid, acc.grtId, acc.name, acc.level,
          acc.canViewAll, acc.canApprove, acc.canOverridePerf, acc.canExport,
          ceoUserId || 1]);
      console.log(`  ✓ ${acc.grtId} ${acc.name} — level=${acc.level}`);
    }

    // ── Summary ─────────────────────────────────────────
    const [structTotal] = (await pool.query(`SELECT COUNT(*) as cnt FROM salary_structures`)).rows;
    const [attTotal] = (await pool.query(`SELECT COUNT(*) as cnt FROM attendance_records WHERE period = '2026-01'`)).rows;
    const [perfTotal] = (await pool.query(`SELECT COUNT(*) as cnt FROM performance_evaluations WHERE period = '2026-01'`)).rows;

    console.log("\n=== Final State ===");
    console.log(`  salary_structures:       ${structTotal.cnt} records`);
    console.log(`  attendance_records:       ${attTotal.cnt} records (2026-01)`);
    console.log(`  performance_evaluations:  ${perfTotal.cnt} records (2026-01)`);

    // Verify key employees
    console.log("\n=== Verification Points ===");
    console.log("  Expected: 倪亚东 net pay = ¥29,086.11");
    console.log("  Expected: 杨勇 net pay = ¥23,132.55");
    console.log("  Run payroll calculation to verify.");

  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
