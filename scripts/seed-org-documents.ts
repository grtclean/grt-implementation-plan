/**
 * Enterprise Document Governance — Seed Script
 * 企业文档治理平台 — 3-Pass 文件系统导入
 *
 * 扫描 doc/org/ 目录，将 395 个 markdown 文件注册到 org_document_registry 表。
 *
 * Pass 1: 递归扫描 15 域 × 101 子目录 → 建立 domain/subdomain 映射
 * Pass 2: 读取每个 .md 文件 → SHA-256 → 插入 registry + V1.0 版本
 * Pass 3: 自动生成交叉链接 (README → TPL, domain → subdomain)
 *
 * 幂等: filePath 做 natural key, content_hash 做变更检测
 *
 * Usage:
 *   npx tsx scripts/seed-org-documents.ts
 */

import pg from "pg";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

dotenv.config();

// ── Helpers ──────────────────────────────────────────────────

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function generateDocCode(domain: string, subdomain: string, fileName: string, idx: number): string {
  const domainNum = domain.split("-")[0] || "XX";
  const subNum = subdomain.split("-")[0] || "00";
  const isTPL = fileName.startsWith("TPL-");
  const suffix = isTPL ? `TPL-${String(idx).padStart(3, "0")}` : `DOC-${String(idx).padStart(3, "0")}`;
  return `ORG-${domainNum}-${subNum}-${suffix}`;
}

function classifyDocType(fileName: string): string {
  if (fileName.startsWith("TPL-")) return "template";
  if (fileName === "README.md") return "readme";
  if (fileName.includes("SOP")) return "sop";
  if (fileName.includes("政策") || fileName.includes("制度")) return "policy";
  if (fileName.includes("报表") || fileName.includes("报告")) return "report";
  if (fileName.includes("台账") || fileName.includes("登记")) return "register";
  return "template";
}

function inferReviewFrequency(docType: string, domain: string): string {
  if (docType === "policy") return "annual";
  if (docType === "sop") return "quarterly";
  if (domain.includes("合规") || domain.includes("质量")) return "quarterly";
  return "annual";
}

function inferOwnerRole(domain: string): string {
  const domainMap: Record<string, string> = {
    "00-公司治理": "director",
    "01-市场与销售": "bu_sales",
    "02-研发设计": "engineer",
    "03-项目管理": "project_manager",
    "04-生产制造": "bu_mech",
    "05-质量管理": "quality_eng",
    "06-供应链管理": "procurement_eng",
    "07-客户服务": "cs_engineer",
    "08-人力资源": "hr_manager",
    "09-财务管理": "finance_director",
    "10-能力体系": "director",
    "11-行政与OA": "director",
    "12-IT与数字化": "admin",
    "13-事业部运营": "bu_gm",
    "14-KPI与报表中心": "director",
  };
  return domainMap[domain] || "director";
}

interface FileEntry {
  domain: string;
  subdomain: string;
  fileName: string;
  filePath: string; // relative to project root
  absolutePath: string;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log("  Enterprise Document Governance — Seed Script");
  console.log("  企业文档治理平台 — 3-Pass 文件系统导入");
  console.log("═".repeat(60));
  console.log();

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const baseDir = path.resolve(__dirname, "../doc/org");
    if (!fs.existsSync(baseDir)) {
      console.error(`ERROR: doc/org directory not found at ${baseDir}`);
      process.exit(1);
    }

    // ═══════════ Pass 1: Scan directories ═══════════
    console.log("── Pass 1: Scanning directories ──");
    const files: FileEntry[] = [];
    const domains = fs.readdirSync(baseDir).filter((d) => {
      const stat = fs.statSync(path.join(baseDir, d));
      return stat.isDirectory();
    });

    console.log(`  Found ${domains.length} domains`);

    for (const domain of domains) {
      const domainPath = path.join(baseDir, domain);

      // Domain-level README
      const domainReadme = path.join(domainPath, "README.md");
      if (fs.existsSync(domainReadme)) {
        files.push({
          domain,
          subdomain: domain,
          fileName: "README.md",
          filePath: `doc/org/${domain}/README.md`,
          absolutePath: domainReadme,
        });
      }

      // Subdomains
      const subdomains = fs.readdirSync(domainPath).filter((s) => {
        const stat = fs.statSync(path.join(domainPath, s));
        return stat.isDirectory();
      });

      for (const sub of subdomains) {
        const subPath = path.join(domainPath, sub);
        const mdFiles = fs.readdirSync(subPath).filter((f) => f.endsWith(".md"));
        for (const mdFile of mdFiles) {
          files.push({
            domain,
            subdomain: sub,
            fileName: mdFile,
            filePath: `doc/org/${domain}/${sub}/${mdFile}`,
            absolutePath: path.join(subPath, mdFile),
          });
        }
      }
    }

    console.log(`  Total files found: ${files.length}`);
    console.log();

    // ═══════════ Pass 2: Import files ═══════════
    console.log("── Pass 2: Importing files to registry ──");

    let inserted = 0;
    let skipped = 0;
    let updated = 0;
    let docIdx = 0;

    for (const file of files) {
      docIdx++;
      const content = fs.readFileSync(file.absolutePath, "utf8");
      const hash = sha256(content);
      const docCode = generateDocCode(file.domain, file.subdomain, file.fileName, docIdx);
      const docType = classifyDocType(file.fileName);
      const title = file.fileName.replace(/\.md$/, "").replace(/^TPL-/, "");
      const ownerRole = inferOwnerRole(file.domain);
      const reviewFrequency = inferReviewFrequency(docType, file.domain);

      // Calculate next review due date (1 year from now for annual, etc.)
      const now = new Date();
      const reviewMonths = reviewFrequency === "monthly" ? 1 : reviewFrequency === "quarterly" ? 3 : 12;
      const nextReview = new Date(now.getTime() + reviewMonths * 30 * 24 * 60 * 60 * 1000);

      // Check if already exists by file_path (idempotent)
      const existing = await client.query(
        "SELECT id, content_hash FROM org_document_registry WHERE file_path = $1",
        [file.filePath],
      );

      if (existing.rows.length > 0) {
        // Check if content changed
        if (existing.rows[0].content_hash === hash) {
          skipped++;
          continue;
        }
        // Update content
        await client.query(
          `UPDATE org_document_registry SET
            markdown_content = $1, content_hash = $2, updated_at = NOW()
          WHERE id = $3`,
          [content, hash, existing.rows[0].id],
        );
        updated++;
        continue;
      }

      // Insert new document
      const result = await client.query(
        `INSERT INTO org_document_registry (
          doc_code, title, title_en, description,
          domain, subdomain, doc_type, status,
          file_path, markdown_content, content_hash,
          current_version, version_major, version_minor, total_versions,
          owner_role, all_bus, review_frequency,
          next_review_due_at, review_overdue,
          tags, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, 'active',
          $8, $9, $10,
          'V1.0', 1, 0, 1,
          $11, true, $12,
          $13, false,
          $14, NOW(), NOW()
        ) RETURNING id`,
        [
          docCode,
          title,
          null, // title_en — can be filled later
          `${file.domain} / ${file.subdomain} — ${file.fileName}`,
          file.domain,
          file.subdomain,
          docType,
          file.filePath,
          content,
          hash,
          ownerRole,
          reviewFrequency,
          nextReview.toISOString(),
          JSON.stringify([docType, file.domain.split("-").pop()]),
        ],
      );

      const docId = result.rows[0].id;

      // Create initial V1.0 version
      await client.query(
        `INSERT INTO org_document_versions (
          document_id, version_string, version_major, version_minor,
          markdown_content, content_hash, change_type, change_reason,
          is_latest, review_status, created_at
        ) VALUES ($1, 'V1.0', 1, 0, $2, $3, 'initial', 'Imported from filesystem', true, 'approved', NOW())`,
        [docId, content, hash],
      );

      inserted++;

      if (inserted % 50 === 0) {
        console.log(`  ... ${inserted} documents imported`);
      }
    }

    console.log(`  Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
    console.log();

    // ═══════════ Pass 3: Auto-generate cross-links ═══════════
    console.log("── Pass 3: Generating cross-links ──");

    // Link READMEs to TPLs in the same subdomain
    let linksCreated = 0;
    const readmeDocs = await client.query(
      "SELECT id, domain, subdomain FROM org_document_registry WHERE doc_type = 'readme'",
    );

    for (const readme of readmeDocs.rows) {
      const tpls = await client.query(
        `SELECT id FROM org_document_registry
         WHERE domain = $1 AND subdomain = $2 AND doc_type != 'readme'`,
        [readme.domain, readme.subdomain],
      );

      for (const tpl of tpls.rows) {
        // Check if link already exists
        const existingLink = await client.query(
          `SELECT id FROM org_document_links
           WHERE source_doc_id = $1 AND target_doc_id = $2`,
          [readme.id, tpl.id],
        );

        if (existingLink.rows.length === 0) {
          await client.query(
            `INSERT INTO org_document_links (
              source_doc_id, target_doc_id, target_type, link_type, description, created_at
            ) VALUES ($1, $2, 'document', 'references', 'Auto-linked: README → Template', NOW())`,
            [readme.id, tpl.id],
          );
          linksCreated++;
        }
      }
    }

    console.log(`  Cross-links created: ${linksCreated}`);
    console.log();

    // ═══════════ Summary ═══════════
    const totalCount = await client.query("SELECT count(*) FROM org_document_registry");
    const versionCount = await client.query("SELECT count(*) FROM org_document_versions");
    const linkCount = await client.query("SELECT count(*) FROM org_document_links");

    console.log("═".repeat(60));
    console.log("  SEED COMPLETE");
    console.log(`  Registry:  ${totalCount.rows[0].count} documents`);
    console.log(`  Versions:  ${versionCount.rows[0].count} version snapshots`);
    console.log(`  Links:     ${linkCount.rows[0].count} cross-references`);
    console.log("═".repeat(60));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
