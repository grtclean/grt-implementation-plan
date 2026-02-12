import { requireDb } from './server/db.ts';
import { projects } from './drizzle/schema.ts';
import { desc, count } from 'drizzle-orm';

async function test() {
  try {
    const db = await requireDb();
    console.log('Database connected');
    
    // 查询项目
    const items = await db.select().from(projects).orderBy(desc(projects.createdAt)).limit(20);
    console.log('Projects found:', items.length);
    console.log('Projects:', JSON.stringify(items, null, 2));
    
    // 查询总数
    const totalResult = await db.select({ count: count() }).from(projects);
    console.log('Total count:', totalResult[0]?.count);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
