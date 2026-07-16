const { PrismaClient } = require('../src/generated/prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Querying requests...");
    const requests = await prisma.request.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            defaultStudio: { select: { name: true } },
          },
        },
        reviewer: {
          select: { name: true },
        },
      },
    });
    console.log(`Found ${requests.length} requests`);

    console.log("Querying corrections...");
    const corrections = await prisma.attendanceCorrection.findMany({
      include: {
        requestedBy: {
          select: {
            name: true,
            email: true,
            defaultStudio: { select: { name: true } },
          },
        },
        attendanceRecord: {
          select: {
            attendanceDate: true,
          },
        },
        approvedBy: {
          select: { name: true },
        },
      },
    });
    console.log(`Found ${corrections.length} corrections`);
  } catch (err) {
    console.error("ERROR DURING QUERY:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
