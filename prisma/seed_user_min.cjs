// prisma/seed_user_min.cjs
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const email = "matt.b.little@gmail.com";
  const name  = "Matt Little";
  const slug  = "matt-little";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, slug },
    create: {
      email,
      name,
      slug,
      // defaults that match your model
      phonePrivate: true,
      emailPrivate: true,
    },
    select: { id: true, email: true, name: true, slug: true },
  });

  console.log("Upserted user:", user);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
