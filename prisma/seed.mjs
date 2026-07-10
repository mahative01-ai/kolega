import process from "node:process";
import { randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

process.loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const { Pool } = pg;
const pool = new Pool({ connectionString });

function hashPassword(password, salt) {
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

async function upsertStudio(client, { name, slug, address }) {
  const { rows } = await client.query(
    `
      INSERT INTO "Studio" ("id", "name", "slug", "address", "radiusMeters", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, 100, true, NOW(), NOW())
      ON CONFLICT ("slug") DO UPDATE SET
        "name" = EXCLUDED."name",
        "address" = EXCLUDED."address",
        "updatedAt" = NOW()
      RETURNING "id";
    `,
    [randomUUID(), name, slug, address]
  );

  return rows[0].id;
}

async function upsertUser(client, data) {
  const { rows } = await client.query(
    `
      INSERT INTO "User" (
        "id", "name", "email", "role", "memberStatus", "accountStatus",
        "defaultStudioId", "passwordHash", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $7, NOW(), NOW())
      ON CONFLICT ("email") DO UPDATE SET
        "name" = EXCLUDED."name",
        "role" = EXCLUDED."role",
        "memberStatus" = EXCLUDED."memberStatus",
        "accountStatus" = EXCLUDED."accountStatus",
        "defaultStudioId" = EXCLUDED."defaultStudioId",
        "passwordHash" = EXCLUDED."passwordHash",
        "updatedAt" = NOW()
      RETURNING "id";
    `,
    [
      randomUUID(),
      data.name,
      data.email,
      data.role,
      data.memberStatus,
      data.defaultStudioId,
      data.passwordHash ?? null,
    ]
  );

  return rows[0].id;
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const mahativeId = await upsertStudio(client, {
      name: "Mahative Studio",
      slug: "mahative",
      address: "Mahative Studio",
    });

    const kipaId = await upsertStudio(client, {
      name: "Kipa",
      slug: "kipa",
      address: "Kipa",
    });

    const superAdminId = await upsertUser(client, {
      name: "Owner Mahative",
      email: "owner.mahative@kolega.local",
      role: "SUPER_ADMIN",
      memberStatus: "TEAM",
      defaultStudioId: mahativeId,
      passwordHash: hashPassword("owner123", "owner-preview-salt"),
    });

    await upsertUser(client, {
      name: "Owner Kipa",
      email: "owner.kipa@kolega.local",
      role: "SUPER_ADMIN",
      memberStatus: "TEAM",
      defaultStudioId: kipaId,
      passwordHash: hashPassword("owner123", "owner-preview-salt"),
    });

    const adminId = await upsertUser(client, {
      name: "Admin Mahative",
      email: "admin.mahative@kolega.local",
      role: "ADMIN",
      memberStatus: "TEAM",
      defaultStudioId: mahativeId,
      passwordHash: hashPassword("admin123", "admin-preview-salt"),
    });

    await upsertUser(client, {
      name: "Admin Kipa",
      email: "admin.kipa@kolega.local",
      role: "ADMIN",
      memberStatus: "TEAM",
      defaultStudioId: kipaId,
      passwordHash: hashPassword("admin123", "admin-preview-salt"),
    });

    const memberId = await upsertUser(client, {
      name: "Member Preview",
      email: "member@kolega.local",
      role: "MEMBER",
      memberStatus: "INTERN",
      defaultStudioId: mahativeId,
      passwordHash: hashPassword("member123", "member-preview-salt"),
    });

    await client.query(
      `
        INSERT INTO "InternProfile" (
          "id", "userId", "program", "institution", "startDate", "endDate",
          "mentorId", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, 'MAGANG', 'Preview School', '2026-06-01', '2026-12-31', $3, NOW(), NOW())
        ON CONFLICT ("userId") DO UPDATE SET
          "institution" = EXCLUDED."institution",
          "mentorId" = EXCLUDED."mentorId",
          "updatedAt" = NOW();
      `,
      [randomUUID(), memberId, adminId]
    );

    await client.query(
      `
        INSERT INTO "AttendancePolicy" (
          "id", "studioId", "checkInTime", "checkOutTime", "graceMinutes",
          "alphaCutoffTime", "sickCutoffMinutes", "permissionNoticeHours",
          "lateSameDayMakeup", "alphaOtherDayMakeup", "isActive",
          "createdById", "createdAt", "updatedAt"
        )
        VALUES (
          'mahative-default-policy', $1, '08:00', '16:00', 10,
          '12:00', 60, 24, true, true, true, $2, NOW(), NOW()
        )
        ON CONFLICT ("id") DO UPDATE SET
          "studioId" = EXCLUDED."studioId",
          "updatedAt" = NOW();
      `,
      [mahativeId, superAdminId]
    );

    const workRules = [
      [1, false],
      [2, true],
      [3, true],
      [4, true],
      [5, true],
      [6, true],
      [7, false],
    ];

    for (const [dayOfWeek, isWorkday] of workRules) {
      await client.query(
        `
          INSERT INTO "WeeklyWorkRule" (
            "id", "studioId", "dayOfWeek", "isWorkday", "workStartTime",
            "workEndTime", "breakStartTime", "breakEndTime", "createdAt", "updatedAt"
          )
          VALUES ($1, $2, $3, $4, '08:00', '16:00', '11:30', '12:30', NOW(), NOW())
          ON CONFLICT ("studioId", "dayOfWeek") DO UPDATE SET
            "isWorkday" = EXCLUDED."isWorkday",
            "updatedAt" = NOW();
        `,
        [randomUUID(), mahativeId, dayOfWeek, isWorkday]
      );
    }

    await client.query(
      `
        INSERT INTO "Placement" (
          "id", "userId", "studioId", "startDate", "endDate", "status",
          "reason", "createdById", "createdAt", "updatedAt"
        )
        VALUES (
          'preview-placement-kipa', $1, $2, '2026-06-24', '2026-07-24',
          'ACTIVE', 'Preview placement lintas studio', $3, NOW(), NOW()
        )
        ON CONFLICT ("id") DO UPDATE SET
          "userId" = EXCLUDED."userId",
          "studioId" = EXCLUDED."studioId",
          "updatedAt" = NOW();
      `,
      [memberId, kipaId, superAdminId]
    );

    await client.query(
      `
        INSERT INTO "PersonalWorkSchedule" (
          "id", "userId", "workDate", "workMode", "studioId", "note",
          "createdById", "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, '2026-06-24', 'WFH', $3, 'Preview WFH dari Super Admin',
          $4, NOW(), NOW()
        )
        ON CONFLICT ("userId", "workDate") DO UPDATE SET
          "workMode" = EXCLUDED."workMode",
          "studioId" = EXCLUDED."studioId",
          "note" = EXCLUDED."note",
          "updatedAt" = NOW();
      `,
      [randomUUID(), memberId, mahativeId, superAdminId]
    );

    await client.query(
      `
        INSERT INTO "AttendanceRecord" (
          "id", "userId", "attendanceDate", "ownerStudioId", "locationStudioId",
          "workMode", "status", "locationValidationStatus", "wfhPlan", "wfhReport",
          "createdById", "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, '2026-06-24', $3, $4, 'WFH', 'WFH', 'NOT_REQUIRED',
          'Menyusun halaman dashboard preview.', 'Draft dashboard awal selesai.',
          $2, NOW(), NOW()
        )
        ON CONFLICT ("userId", "attendanceDate") DO UPDATE SET
          "workMode" = EXCLUDED."workMode",
          "status" = EXCLUDED."status",
          "wfhPlan" = EXCLUDED."wfhPlan",
          "wfhReport" = EXCLUDED."wfhReport",
          "updatedAt" = NOW();
      `,
      [randomUUID(), memberId, mahativeId, mahativeId]
    );

    await client.query("COMMIT");
    console.log("Seed selesai: data preview berhasil dibuat.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
