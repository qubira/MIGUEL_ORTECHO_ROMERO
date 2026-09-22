import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || "Administrador";
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Define ADMIN_USERNAME y ADMIN_PASSWORD en tu .env antes de ejecutar el seed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, name, role: "ADMIN" },
    create: { name, username, passwordHash, role: "ADMIN" },
  });

  console.log(`Usuario administrador listo: ${admin.username}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
