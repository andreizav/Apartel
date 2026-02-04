import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = 'a@1';
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.staff.findMany({
        where: { email: { equals: email } }
    });

    if (user.length > 0) {
        await prisma.staff.update({
            where: { id: user[0].id },
            data: { password: hashedPassword }
        });
        console.log(`Password updated for ${email}`);
    } else {
        console.log(`User ${email} not found`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
