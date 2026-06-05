import bcrypt from "bcryptjs";
import prisma from "../src/lib/db.js";

async function main() {
  console.log("Starting seed script...");

  console.log("Clearing existing data...");
  await prisma.click.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.url.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating users...");
  const passwordHash = await bcrypt.hash("password123", 10);

  const testUser = await prisma.user.create({
    data: {
      email: "test@lynx.dev",
      passwordHash,
      name: "Test User",
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@lynx.dev",
      passwordHash,
      name: "Demo User",
    },
  });

  const urlTargets = [
    "https://github.com",
    "https://google.com",
    "https://vercel.com",
  ];

  console.log("Creating URLs and clicks for Test User...");
  for (let i = 0; i < 3; i++) {
    const url = await prisma.url.create({
      data: {
        userId: testUser.id,
        shortCode: `test0${i + 1}`,
        originalUrl: urlTargets[i]!,
      },
    });

    for (let j = 0; j < 5; j++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      await prisma.click.create({
        data: {
          urlId: url.id,
          device: ["desktop", "mobile", "tablet"][j % 3]!,
          browser: ["Chrome", "Safari", "Firefox"][j % 3]!,
          country: ["US", "UK", "IN", "CA", "DE"][j % 5]!,
          clickedAt: date,
        },
      });
    }
  }

  console.log("Creating URLs and clicks for Demo User...");
  for (let i = 0; i < 3; i++) {
    const url = await prisma.url.create({
      data: {
        userId: demoUser.id,
        shortCode: `demo0${i + 1}`,
        originalUrl: urlTargets[i]!,
      },
    });

    for (let j = 0; j < 5; j++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      await prisma.click.create({
        data: {
          urlId: url.id,
          device: ["desktop", "mobile", "tablet"][j % 3]!,
          browser: ["Chrome", "Safari", "Firefox"][j % 3]!,
          country: ["US", "UK", "IN", "CA", "DE"][j % 5]!,
          clickedAt: date,
        },
      });
    }
  }

  console.log("Seeding complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
