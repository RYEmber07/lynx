import bcrypt from "bcryptjs";
import prisma from "../src/lib/db.js";

function getDevice() {
  const r = Math.random();
  if (r < 0.6) return "desktop";
  if (r < 0.9) return "mobile";
  return "tablet";
}

const browsers = ["Chrome", "Safari", "Firefox", "Edge"];
const osList = ["Windows", "macOS", "iOS", "Android", "Linux"];
const locations = [
  {country: "US", city: "New York"},
  {country: "IN", city: "Mumbai"},
  {country: "GB", city: "London"},
  {country: "DE", city: "Berlin"},
  {country: "CA", city: "Toronto"},
  {country: "FR", city: "Paris"},
  {country: "AU", city: "Sydney"},
  {country: "BR", city: "São Paulo"},
];

const fakeIps = Array.from(
  {length: 20},
  () =>
    `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
);

const referrers = [
  "https://twitter.com",
  "https://linkedin.com",
  "https://reddit.com",
  null,
  null,
  null,
  null,
  null,
];

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

  async function createUrlsAndClicksForUser(userId: string, prefix: string) {
    for (let i = 0; i < 3; i++) {
      const url = await prisma.url.create({
        data: {
          userId,
          shortCode: `${prefix}0${i + 1}`,
          originalUrl: urlTargets[i]!,
        },
      });

      const clicks = [];
      for (let j = 0; j < 50; j++) {
        const date = new Date();
        date.setTime(
          date.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
        );
        const loc = locations[Math.floor(Math.random() * locations.length)]!;

        clicks.push({
          urlId: url.id,
          ipAddress: fakeIps[Math.floor(Math.random() * fakeIps.length)]!,
          device: getDevice(),
          browser: browsers[Math.floor(Math.random() * browsers.length)]!,
          os: osList[Math.floor(Math.random() * osList.length)]!,
          country: loc.country,
          city: loc.city,
          referrer: referrers[Math.floor(Math.random() * referrers.length)] ?? null,
          clickedAt: date,
        });
      }
      
      await prisma.click.createMany({
        data: clicks,
      });
    }
  }

  console.log("Creating URLs and clicks for Test User...");
  await createUrlsAndClicksForUser(testUser.id, "test");

  console.log("Creating URLs and clicks for Demo User...");
  await createUrlsAndClicksForUser(demoUser.id, "demo");

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
