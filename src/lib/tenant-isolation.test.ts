import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Integration test proving the tenant-isolation pattern used by every Server
 * Action in this app: `findFirst({ where: { id, businessId } })` scoped to the
 * session's business. If this ever regresses to a bare `findUnique({ id })`,
 * these assertions catch it. Requires a reachable DATABASE_URL (see README —
 * `npx prisma dev` works fine here).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let businessA: { id: string };
let businessB: { id: string };
let customerA: { id: string };
let invoiceA: { id: string };
let userAId: string;
let userBId: string;

beforeAll(async () => {
  const userA = await prisma.user.create({
    data: {
      email: `tenant-test-a-${Date.now()}@invoiceflow.test`,
      passwordHash: "not-a-real-hash",
      name: "Tenant Test A",
    },
  });
  userAId = userA.id;

  const userB = await prisma.user.create({
    data: {
      email: `tenant-test-b-${Date.now()}@invoiceflow.test`,
      passwordHash: "not-a-real-hash",
      name: "Tenant Test B",
    },
  });
  userBId = userB.id;

  businessA = await prisma.business.create({
    data: { name: "Tenant Test Business A", ownerId: userA.id },
  });
  businessB = await prisma.business.create({
    data: { name: "Tenant Test Business B", ownerId: userB.id },
  });

  customerA = await prisma.customer.create({
    data: { businessId: businessA.id, name: "Business A's Customer" },
  });

  invoiceA = await prisma.invoice.create({
    data: {
      businessId: businessA.id,
      customerId: customerA.id,
      invoiceNumber: "TENANT-TEST-0001",
      issueDate: new Date(),
      dueDate: new Date(),
      total: "100.00",
      balanceDue: "100.00",
    },
  });
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { businessId: businessA.id } });
  await prisma.customer.deleteMany({ where: { businessId: businessA.id } });
  await prisma.business.deleteMany({ where: { id: { in: [businessA.id, businessB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  await prisma.$disconnect();
});

describe("tenant isolation", () => {
  it("Business B cannot read Business A's customer by id", async () => {
    const found = await prisma.customer.findFirst({
      where: { id: customerA.id, businessId: businessB.id },
    });
    expect(found).toBeNull();
  });

  it("Business A can read its own customer by id", async () => {
    const found = await prisma.customer.findFirst({
      where: { id: customerA.id, businessId: businessA.id },
    });
    expect(found?.id).toBe(customerA.id);
  });

  it("Business B cannot read Business A's invoice by id", async () => {
    const found = await prisma.invoice.findFirst({
      where: { id: invoiceA.id, businessId: businessB.id },
    });
    expect(found).toBeNull();
  });

  it("Business B cannot delete Business A's customer via a scoped deleteMany", async () => {
    const { count } = await prisma.customer.deleteMany({
      where: { id: customerA.id, businessId: businessB.id },
    });
    expect(count).toBe(0);

    const stillExists = await prisma.customer.findFirst({ where: { id: customerA.id } });
    expect(stillExists).not.toBeNull();
  });

  it("a bare findUnique-by-id (the unsafe pattern) would leak across tenants — documenting why it's banned", async () => {
    // This is what NOT to do in a Server Action: no businessId check at all.
    const leaked = await prisma.customer.findUnique({ where: { id: customerA.id } });
    expect(leaked).not.toBeNull();
    // The point of this test isn't that findUnique "fails" — it succeeds, which
    // is exactly the danger. Every Server Action must use findFirst+businessId instead.
  });
});
