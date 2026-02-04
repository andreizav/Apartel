import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- Table Info (Staff) ---');
    const tableInfo: any = await prisma.$queryRawUnsafe(`PRAGMA table_info(Staff)`);
    console.log(tableInfo);

    const staff = await prisma.staff.findMany();
    console.log('--- Staff Records ---');
    staff.forEach((s: any) => {
        console.log(`ID: ${s.id}, Email: ${s.email}, HasPassword: ${!!s.password}`);
    });
    console.log('--- End ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
