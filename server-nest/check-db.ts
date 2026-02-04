import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        console.log('--- Table Info ("Transaction") ---');
        const tableInfo: any = await prisma.$queryRawUnsafe(`PRAGMA table_info("Transaction")`);

        // Custom replacer for BigInt
        const output = JSON.stringify(tableInfo, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value,
            2
        );
        console.log(output);

        console.log('--- Testing query WITHOUT unitId first ---');
        const txsRaw = await prisma.$queryRawUnsafe(`SELECT * FROM "Transaction" LIMIT 1`);
        console.log('Raw Query Results:', txsRaw);

    } catch (err) {
        console.error('--- Error occurred ---');
        console.error(err);
    } finally {
        console.log('--- End ---');
        await prisma.$disconnect();
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
