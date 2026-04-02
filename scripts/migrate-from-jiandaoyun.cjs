/**
 * 简道云 → GRT System 全量数据迁移脚本
 *
 * 用法:
 *   node scripts/migrate-from-jiandaoyun.cjs                    # 全量迁移（8阶段）
 *   node scripts/migrate-from-jiandaoyun.cjs --phase org        # 仅组织同步
 *   node scripts/migrate-from-jiandaoyun.cjs --phase org,user   # 多阶段
 *   node scripts/migrate-from-jiandaoyun.cjs --dry-run          # 预演模式（不写入）
 *   node scripts/migrate-from-jiandaoyun.cjs --test-only        # 仅测试连接
 *   node scripts/migrate-from-jiandaoyun.cjs --verify           # 仅校验已导入数据
 *
 * 阶段: org → user → discovery → project → approval → procurement → complaint → knowledge
 */

const http = require("http");

const BASE_URL = process.env.GRT_API_URL || "http://localhost:5000";
const ALL_PHASES = ["org", "user", "discovery", "project", "approval", "procurement", "complaint", "knowledge"];

// ── CLI 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--phase" && args[i + 1]) {
    flags.phases = args[i + 1].split(",").map(s => s.trim());
    i++;
  } else if (args[i] === "--dry-run") {
    flags.dryRun = true;
  } else if (args[i] === "--test-only") {
    flags.testOnly = true;
  } else if (args[i] === "--verify") {
    flags.verifyOnly = true;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
简道云 → GRT System 迁移脚本

用法:
  node scripts/migrate-from-jiandaoyun.cjs [options]

选项:
  --phase <phases>   指定阶段 (逗号分隔): org,user,discovery,project,approval,procurement,complaint,knowledge
  --dry-run          预演模式，不实际写入数据
  --test-only        仅测试简道云API连接
  --verify           仅校验已导入数据的完整性
  --help, -h         显示帮助
`);
    process.exit(0);
  }
}

// ── HTTP 请求工具 ──────────────────────────────────────────────
function trpcQuery(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/api/trpc/${path}`;
    http.get(url, { headers: { "Content-Type": "application/json" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json.result?.data ?? json);
        } catch {
          reject(new Error(`Failed to parse response from ${path}: ${data.substring(0, 200)}`));
        }
      });
    }).on("error", reject);
  });
}

function trpcMutation(path, input) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/api/trpc/${path}`;
    const body = JSON.stringify(input);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            resolve(json.result?.data ?? json);
          }
        } catch {
          reject(new Error(`Failed to parse response from ${path}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── 格式化工具 ──────────────────────────────────────────────
function logSection(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

function logStep(step, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`  [${ts}] ${step} ${msg}`);
}

function logResult(label, value) {
  console.log(`    ${label.padEnd(20)} ${value}`);
}

// ── Step 1: 测试连接 ──────────────────────────────────────────
async function testConnection() {
  logSection("Step 1: 测试简道云 API 连接");
  try {
    const result = await trpcQuery("externalSync.testConnection");
    if (result?.success) {
      logStep("OK", `连接成功 — 发现 ${result.apps || 0} 个应用`);
      if (result.appList?.length) {
        console.log("    应用列表:");
        for (const app of result.appList.slice(0, 20)) {
          console.log(`      - ${app.name} (${app.app_id})`);
        }
        if (result.appList.length > 20) {
          console.log(`      ... 共 ${result.appList.length} 个应用`);
        }
      }
      return true;
    } else {
      logStep("FAIL", `连接失败: ${result?.message || "未知错误"}`);
      return false;
    }
  } catch (err) {
    logStep("FAIL", `连接错误: ${err.message}`);
    return false;
  }
}

// ── Step 2: 启动全量导入 ──────────────────────────────────────
async function startMigration(phases, dryRun) {
  const phaseStr = phases.join(" → ");
  logSection(`Step 2: 启动数据迁移 ${dryRun ? "(预演模式)" : ""}`);
  logStep("INFO", `执行阶段: ${phaseStr}`);

  try {
    const result = await trpcMutation("externalSync.startFullImport", {
      phases,
      dryRun: !!dryRun,
    });
    const runCode = result?.runCode || result;
    logStep("OK", `导入任务已启动: ${runCode}`);
    return runCode;
  } catch (err) {
    logStep("FAIL", `启动失败: ${err.message}`);
    return null;
  }
}

// ── Step 3: 轮询进度 ──────────────────────────────────────────
async function pollProgress(runCode) {
  logSection("Step 3: 导入进度追踪");
  let lastStep = "";

  while (true) {
    try {
      const progress = await trpcQuery(`externalSync.getImportProgress?input=${encodeURIComponent(JSON.stringify({ runCode }))}`);
      if (!progress) {
        logStep("WARN", "无法获取进度");
        break;
      }

      if (progress.currentStep !== lastStep) {
        lastStep = progress.currentStep || "";
        logStep(`${progress.progressPercent || 0}%`, lastStep);
      }

      if (["completed", "failed", "cancelled"].includes(progress.status)) {
        return progress;
      }

      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      logStep("WARN", `轮询错误: ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return null;
}

// ── Step 4: 校验报告 ──────────────────────────────────────────
async function verifyImport() {
  logSection("Step 4: 数据完整性校验");
  try {
    const v = await trpcQuery("externalSync.getImportVerification");
    if (!v) {
      logStep("WARN", "无法获取校验数据");
      return;
    }

    console.log("\n  ┌─────────────────────────┬──────────┬──────────┐");
    console.log("  │ 数据类型                │ 数量     │ 状态     │");
    console.log("  ├─────────────────────────┼──────────┼──────────┤");

    if (v.departments) {
      const cnt = v.departments.extCount || 0;
      console.log(`  │ 部门映射                │ ${String(cnt).padStart(8)} │ ${cnt > 0 ? "  OK  " : " EMPTY"} │`);
    }
    if (v.users) {
      const ext = v.users.extCount || 0;
      const linked = v.users.linkedCount || 0;
      console.log(`  │ 用户映射 (总/已关联)    │ ${String(ext).padStart(3)}/${String(linked).padStart(4)} │ ${linked > 0 ? "  OK  " : " EMPTY"} │`);
    }
    if (v.projects) {
      const cnt = v.projects.importedCount || 0;
      console.log(`  │ 项目数据                │ ${String(cnt).padStart(8)} │ ${cnt > 0 ? "  OK  " : " EMPTY"} │`);
    }
    if (v.approvals) {
      const cnt = v.approvals.importedCount || 0;
      console.log(`  │ 审批流程                │ ${String(cnt).padStart(8)} │ ${cnt > 0 ? "  OK  " : " EMPTY"} │`);
    }
    if (v.orphanedReferences) {
      const cnt = v.orphanedReferences.count || 0;
      console.log(`  │ 孤立引用                │ ${String(cnt).padStart(8)} │ ${cnt === 0 ? "  OK  " : " WARN "} │`);
    }

    console.log("  └─────────────────────────┴──────────┴──────────┘");

    // 映射统计
    try {
      const stats = await trpcQuery("externalSync.getMappingStats");
      if (stats) {
        console.log("\n  表单映射统计:");
        logResult("已发现表单", stats.totalForms || 0);
        logResult("已分类表单", stats.classifiedForms || 0);
        logResult("已确认表单", stats.confirmedForms || 0);
        logResult("缓存数据条数", stats.cachedRecords || 0);
      }
    } catch { /* optional */ }
  } catch (err) {
    logStep("FAIL", `校验失败: ${err.message}`);
  }
}

// ── Step 5: 打印迁移报告 ──────────────────────────────────────
function printReport(progress) {
  logSection("迁移完成报告");
  if (!progress) {
    logStep("WARN", "无进度数据");
    return;
  }

  console.log(`\n  状态: ${progress.status === "completed" ? "SUCCESS" : progress.status.toUpperCase()}`);
  console.log(`  运行代码: ${progress.runCode}`);
  console.log(`  开始时间: ${progress.startedAt || "-"}`);
  console.log(`  完成时间: ${progress.completedAt || "-"}`);
  console.log("");
  console.log("  ┌──────────┬──────────┐");
  console.log("  │ 统计项   │ 数量     │");
  console.log("  ├──────────┼──────────┤");
  console.log(`  │ 新建     │ ${String(progress.totalCreated || 0).padStart(8)} │`);
  console.log(`  │ 更新     │ ${String(progress.totalUpdated || 0).padStart(8)} │`);
  console.log(`  │ 跳过     │ ${String(progress.totalSkipped || 0).padStart(8)} │`);
  console.log(`  │ 失败     │ ${String(progress.totalFailed || 0).padStart(8)} │`);
  console.log("  └──────────┴──────────┘");

  if (progress.phaseResults) {
    console.log("\n  各阶段详情:");
    for (const [phase, result] of Object.entries(progress.phaseResults)) {
      const r = result || {};
      console.log(`    ${phase}: created=${r.created || 0} updated=${r.updated || 0} skipped=${r.skipped || 0} failed=${r.failed || 0}`);
    }
  }

  if (progress.errors?.length) {
    console.log(`\n  错误 (${progress.errors.length} 条):`);
    for (const err of progress.errors.slice(0, 20)) {
      console.log(`    [${err.phase}] ${err.message}`);
    }
    if (progress.errors.length > 20) {
      console.log(`    ... 共 ${progress.errors.length} 条错误`);
    }
  }
}

// ── 主流程 ──────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  简道云 → GRT System 数据迁移工具                      ║");
  console.log("║  版本: 2.0  日期: 2026-03-30                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // 仅测试连接
  if (flags.testOnly) {
    const ok = await testConnection();
    process.exit(ok ? 0 : 1);
  }

  // 仅校验
  if (flags.verifyOnly) {
    await verifyImport();
    process.exit(0);
  }

  // Step 1: 测试连接
  const connected = await testConnection();
  if (!connected) {
    console.log("\n  请检查环境变量 JIANDAOYUN_API_KEY / EXT_SYNC_API_KEY 是否正确配置");
    process.exit(1);
  }

  // Step 2: 启动迁移
  const phases = flags.phases || ALL_PHASES;
  const invalidPhases = phases.filter(p => !ALL_PHASES.includes(p));
  if (invalidPhases.length) {
    console.log(`\n  无效阶段: ${invalidPhases.join(", ")}`);
    console.log(`  可用阶段: ${ALL_PHASES.join(", ")}`);
    process.exit(1);
  }

  const runCode = await startMigration(phases, flags.dryRun);
  if (!runCode) {
    process.exit(1);
  }

  // Step 3: 轮询进度
  const progress = await pollProgress(runCode);

  // Step 4: 校验
  if (progress?.status === "completed") {
    await verifyImport();
  }

  // Step 5: 报告
  printReport(progress);

  process.exit(progress?.status === "completed" ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
