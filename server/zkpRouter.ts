import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { requireDb } from './utils/db-helpers';
import { sql } from "drizzle-orm";
import crypto from "crypto";

// ZKP验证请求类型
const zkpRequestTypeEnum = z.enum([
  'vda_19_1_compliance',
  'process_parameter',
  'capability_proof',
  'quality_standard',
  'cost_range',
  'delivery_capacity'
]);

// 生成ZKP请求码
function generateRequestCode(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `ZKP-${timestamp}-${random}`.toUpperCase();
}

// 生成证明哈希
function generateProofHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// 模拟ZKP验证
async function performZKPVerification(
  claimType: string,
  claimParameters: Record<string, unknown>,
  targetEntityType: string,
  targetEntityId?: number
): Promise<{
  isVerified: boolean;
  confidenceLevel: number;
  proof: string;
  publicSummary: Record<string, unknown>;
}> {
  const isVerified = Math.random() > 0.1;
  const confidenceLevel = isVerified ? 95 + Math.random() * 5 : 50 + Math.random() * 30;
  
  const proofData = {
    circuit: 'vda191_compliance_v1',
    publicInputs: [claimType, targetEntityType],
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
  
  const proof = Buffer.from(JSON.stringify(proofData)).toString('base64');
  
  const publicSummary = {
    verificationTime: new Date().toISOString(),
    claimType,
    targetEntityType,
    result: isVerified ? 'COMPLIANT' : 'NON_COMPLIANT',
    standardReference: 'VDA 19.1:2015',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  return { isVerified, confidenceLevel, proof, publicSummary };
}

export const zkpRouter = router({
  // 创建ZKP验证请求
  createVerificationRequest: protectedProcedure
    .input(z.object({
      requestType: zkpRequestTypeEnum,
      targetEntityType: z.enum(['project', 'product', 'process', 'equipment', 'capability']),
      targetEntityId: z.number().optional(),
      targetEntityCode: z.string().optional(),
      claimType: z.string(),
      claimDescription: z.string().optional(),
      claimParameters: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      if (!db) throw new Error('Database not available');
      
      const requestCode = generateRequestCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const result = await db.execute(sql`
        INSERT INTO zkp_verification_requests (
          request_code, request_type, requester_id, requester_type, requester_identity,
          target_entity_type, target_entity_id, target_entity_code,
          claim_type, claim_description, claim_parameters,
          status, expires_at
        ) VALUES (
          ${requestCode}, ${input.requestType}, ${ctx.user.id}, 'human_user', ${ctx.user.name || ctx.user.openId},
          ${input.targetEntityType}, ${input.targetEntityId || null}, ${input.targetEntityCode || null},
          ${input.claimType}, ${input.claimDescription || null}, ${JSON.stringify(input.claimParameters || {})},
          'pending', ${expiresAt.toISOString().slice(0, 19).replace('T', ' ')}
        )
      `);
      
      await db.execute(sql`
        INSERT INTO zkp_verification_audit_logs (
          request_id, action, action_details, actor_type, actor_id
        ) VALUES (
          ${(result as any)[0].insertId}, 'request_created',
          ${JSON.stringify({ requestCode, claimType: input.claimType })},
          'human_user', ${ctx.user.id.toString()}
        )
      `);
      
      return { success: true, requestCode, expiresAt: expiresAt.toISOString() };
    }),

  // 执行ZKP验证
  executeVerification: protectedProcedure
    .input(z.object({ requestCode: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (!db) throw new Error('Database not available');
      
      const requests = await db.execute(sql`
        SELECT * FROM zkp_verification_requests 
        WHERE request_code = ${input.requestCode} AND status = 'pending'
        LIMIT 1
      `);
      
      const request = (requests as any)[0]?.[0];
      if (!request) throw new Error('验证请求不存在或已处理');
      
      await db.execute(sql`
        UPDATE zkp_verification_requests 
        SET status = 'processing', processed_at = NOW()
        WHERE id = ${request.id}
      `);
      
      await db.execute(sql`
        INSERT INTO zkp_verification_audit_logs (
          request_id, action, action_details, actor_type, actor_id
        ) VALUES (
          ${request.id}, 'verification_started',
          ${JSON.stringify({ startTime: new Date().toISOString() })},
          'system', 'zkp_verifier'
        )
      `);
      
      try {
        const verificationResult = await performZKPVerification(
          request.claim_type,
          JSON.parse(request.claim_parameters || '{}'),
          request.target_entity_type,
          request.target_entity_id
        );
        
        const proofHash = generateProofHash(verificationResult.proof);
        
        const resultInsert = await db.execute(sql`
          INSERT INTO zkp_verification_results (
            request_id, is_verified, verification_proof, proof_hash,
            confidence_level, verification_method, public_summary,
            verifier_id, verifier_signature
          ) VALUES (
            ${request.id}, ${verificationResult.isVerified ? 1 : 0},
            ${verificationResult.proof}, ${proofHash},
            ${verificationResult.confidenceLevel.toFixed(2)}, 'zkp_snark_v1',
            ${JSON.stringify(verificationResult.publicSummary)},
            'grt_zkp_verifier_001', ${generateProofHash(verificationResult.proof + Date.now())}
          )
        `);
        
        await db.execute(sql`
          UPDATE zkp_verification_requests 
          SET status = ${verificationResult.isVerified ? 'verified' : 'rejected'}
          WHERE id = ${request.id}
        `);
        
        await db.execute(sql`
          INSERT INTO zkp_verification_audit_logs (
            request_id, result_id, action, action_details, actor_type, actor_id
          ) VALUES (
            ${request.id}, ${(resultInsert as any)[0].insertId},
            ${verificationResult.isVerified ? 'verification_completed' : 'verification_failed'},
            ${JSON.stringify({ 
              isVerified: verificationResult.isVerified,
              confidenceLevel: verificationResult.confidenceLevel 
            })},
            'system', 'zkp_verifier'
          )
        `);
        
        return {
          success: true,
          requestCode: input.requestCode,
          isVerified: verificationResult.isVerified,
          confidenceLevel: verificationResult.confidenceLevel,
          publicSummary: verificationResult.publicSummary,
          proofHash
        };
      } catch (error) {
        await db.execute(sql`
          UPDATE zkp_verification_requests SET status = 'error' WHERE id = ${request.id}
        `);
        throw error;
      }
    }),

  // 查询验证结果（公开接口）
  getVerificationResult: publicProcedure
    .input(z.object({ requestCode: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      if (!db) return null;
      
      const results = await db.execute(sql`
        SELECT 
          r.request_code, r.request_type, r.target_entity_type, r.claim_type,
          r.status, r.requested_at, r.processed_at,
          res.is_verified, res.confidence_level, res.public_summary,
          res.proof_hash, res.verifier_id, res.created_at as verified_at
        FROM zkp_verification_requests r
        LEFT JOIN zkp_verification_results res ON r.id = res.request_id
        WHERE r.request_code = ${input.requestCode}
        LIMIT 1
      `);
      
      const result = (results as any)[0]?.[0];
      if (!result) return null;
      
      return {
        requestCode: result.request_code,
        requestType: result.request_type,
        targetEntityType: result.target_entity_type,
        claimType: result.claim_type,
        status: result.status,
        requestedAt: result.requested_at,
        processedAt: result.processed_at,
        verification: result.is_verified !== null ? {
          isVerified: result.is_verified === 1,
          confidenceLevel: parseFloat(result.confidence_level || '0'),
          publicSummary: JSON.parse(result.public_summary || '{}'),
          proofHash: result.proof_hash,
          verifierId: result.verifier_id,
          verifiedAt: result.verified_at
        } : null
      };
    }),

  // 验证证明哈希（公开接口）
  validateProofHash: publicProcedure
    .input(z.object({ proofHash: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      if (!db) return { valid: false, message: 'Database not available' };
      
      const results = await db.execute(sql`
        SELECT r.request_code, r.claim_type, r.status,
          res.is_verified, res.confidence_level, res.verifier_id, res.created_at
        FROM zkp_verification_results res
        JOIN zkp_verification_requests r ON r.id = res.request_id
        WHERE res.proof_hash = ${input.proofHash}
        LIMIT 1
      `);
      
      const result = (results as any)[0]?.[0];
      if (!result) return { valid: false, message: '证明哈希不存在' };
      
      return {
        valid: true,
        requestCode: result.request_code,
        claimType: result.claim_type,
        isVerified: result.is_verified === 1,
        confidenceLevel: parseFloat(result.confidence_level || '0'),
        verifierId: result.verifier_id,
        verifiedAt: result.created_at
      };
    }),

  // 获取VDA 19.1标准列表（公开接口）
  getVDA191Standards: publicProcedure.query(async () => {
    const db = await requireDb();
    if (!db) return [];
    
    const results = await db.execute(sql`
      SELECT id, standard_code, standard_name, standard_version,
        particle_size_min, particle_size_max, particle_count_limit,
        gravimetric_limit, applicable_industries, applicable_components, test_methods
      FROM vda_191_cleanliness_standards WHERE is_active = 1 ORDER BY standard_code
    `);
    
    return ((results as any)[0] || []).map((row: any) => ({
      id: row.id,
      standardCode: row.standard_code,
      standardName: row.standard_name,
      standardVersion: row.standard_version,
      particleSizeMin: row.particle_size_min,
      particleSizeMax: row.particle_size_max,
      particleCountLimit: row.particle_count_limit,
      gravimetricLimit: row.gravimetric_limit ? parseFloat(row.gravimetric_limit) : null,
      applicableIndustries: JSON.parse(row.applicable_industries || '[]'),
      applicableComponents: JSON.parse(row.applicable_components || '[]'),
      testMethods: JSON.parse(row.test_methods || '[]')
    }));
  }),

  // 获取能力证明配置（公开接口）
  getCapabilityProofs: publicProcedure.query(async () => {
    const db = await requireDb();
    if (!db) return [];
    
    const results = await db.execute(sql`
      SELECT id, capability_code, capability_name, capability_category,
        public_description, public_evidence, zkp_enabled, valid_from, valid_until
      FROM capability_proof_configs WHERE is_active = 1
      ORDER BY capability_category, capability_code
    `);
    
    return ((results as any)[0] || []).map((row: any) => ({
      id: row.id,
      capabilityCode: row.capability_code,
      capabilityName: row.capability_name,
      capabilityCategory: row.capability_category,
      publicDescription: row.public_description,
      publicEvidence: JSON.parse(row.public_evidence || '[]'),
      zkpEnabled: row.zkp_enabled === 1,
      validFrom: row.valid_from,
      validUntil: row.valid_until
    }));
  }),

  // 获取公开能力展示（公开接口，SEO友好）
  getPublicShowcase: publicProcedure
    .input(z.object({
      category: z.enum([
        'cleaning_technology', 'quality_assurance', 'industry_solutions',
        'case_studies', 'certifications'
      ]).optional(),
      slug: z.string().optional(),
      featured: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      if (!db) return [];
      
      let whereClause = "status = 'published'";
      if (input?.category) whereClause += ` AND category = '${input.category}'`;
      if (input?.slug) whereClause += ` AND slug = '${input.slug}'`;
      if (input?.featured) whereClause += ` AND is_featured = 1`;
      
      const results = await db.execute(sql.raw(`
        SELECT id, showcase_code, title, title_en, slug, meta_description, meta_keywords,
          category, summary, summary_en, content, content_en, featured_image, gallery,
          videos, public_stats, published_at, sort_order, is_featured
        FROM public_capability_showcase
        WHERE ${whereClause}
        ORDER BY sort_order ASC, published_at DESC
      `));
      
      return ((results as any)[0] || []).map((row: any) => ({
        id: row.id,
        showcaseCode: row.showcase_code,
        title: row.title,
        titleEn: row.title_en,
        slug: row.slug,
        metaDescription: row.meta_description,
        metaKeywords: row.meta_keywords,
        category: row.category,
        summary: row.summary,
        summaryEn: row.summary_en,
        content: row.content,
        contentEn: row.content_en,
        featuredImage: row.featured_image,
        gallery: JSON.parse(row.gallery || '[]'),
        videos: JSON.parse(row.videos || '[]'),
        publicStats: JSON.parse(row.public_stats || '{}'),
        publishedAt: row.published_at,
        sortOrder: row.sort_order,
        isFeatured: row.is_featured === 1
      }));
    }),

  // 获取验证历史（需登录）
  getVerificationHistory: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
      
      const offset = (input.page - 1) * input.pageSize;
      
      const results = await db.execute(sql`
        SELECT r.id, r.request_code, r.request_type, r.target_entity_type,
          r.claim_type, r.status, r.requested_at, r.processed_at,
          res.is_verified, res.confidence_level, res.proof_hash
        FROM zkp_verification_requests r
        LEFT JOIN zkp_verification_results res ON r.id = res.request_id
        WHERE r.requester_id = ${ctx.user.id}
        ORDER BY r.created_at DESC
        LIMIT ${input.pageSize} OFFSET ${offset}
      `);
      
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM zkp_verification_requests WHERE requester_id = ${ctx.user.id}
      `);
      
      return {
        items: ((results as any)[0] || []).map((row: any) => ({
          id: row.id,
          requestCode: row.request_code,
          requestType: row.request_type,
          targetEntityType: row.target_entity_type,
          claimType: row.claim_type,
          status: row.status,
          requestedAt: row.requested_at,
          processedAt: row.processed_at,
          isVerified: row.is_verified === 1,
          confidenceLevel: row.confidence_level ? parseFloat(row.confidence_level) : null,
          proofHash: row.proof_hash
        })),
        total: (countResult as any)[0]?.[0]?.total || 0,
        page: input.page,
        pageSize: input.pageSize
      };
    }),
});
