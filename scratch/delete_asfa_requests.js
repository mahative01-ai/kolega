const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  // Find the user with username "asfa"
  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: "asfa",
        mode: "insensitive",
      },
    },
  });

  if (!user) {
    console.error("User with username 'asfa' not found.");
    return;
  }

  console.log(`Found user: ${user.name} (${user.id})`);

  // Target dates: July 15, 2026 and July 27, 2026
  const date15 = new Date("2026-07-15T00:00:00.000Z");
  const date27 = new Date("2026-07-27T00:00:00.000Z");

  console.log("Searching for requests on 2026-07-15 and 2026-07-27...");

  // Find all requests for this user overlapping these dates
  const requests = await prisma.request.findMany({
    where: {
      userId: user.id,
      OR: [
        {
          startDate: { lte: date15 },
          endDate: { gte: date15 },
        },
        {
          startDate: { lte: date27 },
          endDate: { gte: date27 },
        },
      ],
    },
  });

  console.log(`Found ${requests.length} request(s) to delete:`);
  for (const r of requests) {
    console.log(`- Request ID: ${r.id}, Type: ${r.type}, Start: ${r.startDate.toISOString().slice(0,10)}, End: ${r.endDate.toISOString().slice(0,10)}, Status: ${r.status}`);
  }

  if (requests.length > 0) {
    const ids = requests.map(r => r.id);
    const deleteCount = await prisma.request.deleteMany({
      where: {
        id: { in: ids },
      },
    });
    console.log(`Successfully deleted ${deleteCount.count} request(s).`);
  } else {
    console.log("No requests found for those dates.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
