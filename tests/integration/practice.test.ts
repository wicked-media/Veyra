import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  createClient,
  createMatter,
  createTask,
  getDashboard,
  getMatterWorkspace,
  getOrganisation,
  inviteMember,
  listAuditEvents,
  listMatters,
  listMatterTasks,
  signIn,
  updateMemberRole,
  updateOrganisationSettings,
  updateTask
} from "@veyra/core";
import { auditEvents, memberships, type DatabaseHandle } from "@veyra/database";
import {
  createFirm,
  createMember,
  createTestDatabase,
  TEST_PASSWORD,
  type TestFirm,
  type TestUser
} from "../helpers";

let handle: DatabaseHandle;
let firm: TestFirm;
let owner: TestUser;
let solicitor: TestUser;

beforeAll(async () => {
  handle = await createTestDatabase();
  firm = await createFirm(handle.db, {
    name: "Practice Test Firm",
    slug: "practice-test",
    prefix: "PTF"
  });
  owner = await createMember(handle.db, firm, {
    email: "owner@practice.test",
    name: "Priya Practice",
    role: "owner"
  });
  solicitor = await createMember(handle.db, firm, {
    email: "solicitor@practice.test",
    name: "Sonia Solicitor",
    role: "solicitor"
  });
});

afterAll(async () => {
  await handle.close();
});

describe("matter lifecycle", () => {
  it("allocates sequential, firm-scoped matter numbers and records an audit event", async () => {
    const client = await createClient(handle.db, owner.actor, {
      type: "organisation",
      displayName: "Practice Client Pty Ltd",
      firstName: null,
      lastName: null,
      organisationName: "Practice Client Pty Ltd",
      email: "contact@practice-client.test",
      phone: null,
      abn: null,
      riskRating: "low",
      source: null,
      notes: null
    });

    const first = await createMatter(handle.db, owner.actor, {
      clientId: client.id,
      title: "First numbered matter",
      description: null,
      practiceArea: "commercial",
      matterType: "Advisory",
      stage: "Open",
      responsibleUserId: solicitor.id,
      restricted: false
    });
    const second = await createMatter(handle.db, owner.actor, {
      clientId: client.id,
      title: "Second numbered matter",
      description: null,
      practiceArea: "commercial",
      matterType: "Advisory",
      stage: "Open",
      responsibleUserId: solicitor.id,
      restricted: false
    });

    expect(first.matterNumber).toMatch(/^PTF-\d{4}-0001$/);
    expect(second.matterNumber).toMatch(/^PTF-\d{4}-0002$/);

    const workspace = await getMatterWorkspace(handle.db, solicitor.actor, first.id);
    expect(workspace.members.map((member) => member.userId)).toEqual(
      expect.arrayContaining([solicitor.id, owner.id])
    );
    expect(workspace.members.find((member) => member.userId === solicitor.id)?.matterRole).toBe(
      "lead"
    );

    const audit = await listAuditEvents(handle.db, owner.actor, {
      entityType: "matter",
      matterId: first.id
    });
    expect(audit.some((event) => event.action === "matter.created")).toBe(true);
  });

  it("creates and completes a matter task with audit history", async () => {
    const [matter] = await listMatters(handle.db, owner.actor, { status: "all", limit: 1 });
    expect(matter).toBeDefined();
    if (!matter) throw new Error("Expected a matter");

    const task = await createTask(handle.db, owner.actor, {
      title: "Draft initial advice",
      description: "Prepare a draft for review.",
      matterId: matter.id,
      assigneeUserId: solicitor.id,
      priority: "high",
      dueOn: "2026-11-20"
    });

    const tasks = await listMatterTasks(handle.db, solicitor.actor, matter.id);
    expect(tasks.map((row) => row.id)).toContain(task.id);

    await updateTask(handle.db, solicitor.actor, task.id, { status: "done" });
    const updated = await listMatterTasks(handle.db, solicitor.actor, matter.id);
    expect(updated.find((row) => row.id === task.id)?.status).toBe("done");

    const audit = await listAuditEvents(handle.db, owner.actor, { entityType: "task" });
    expect(audit.some((event) => event.action === "task.completed")).toBe(true);
  });

  it("returns dashboard data for the firm without financial placeholders", async () => {
    const dashboard = await getDashboard(handle.db, owner.actor);
    expect(dashboard.counts.activeClients).toBeGreaterThan(0);
    expect(dashboard.counts.openMatters).toBeGreaterThan(0);
    expect(dashboard.recentMatters.length).toBeGreaterThan(0);
  });
});

describe("firm administration", () => {
  it("invites a member with a one-time temporary password that must be replaced", async () => {
    const result = await inviteMember(handle.db, owner.actor, {
      name: "New Solicitor",
      email: "new-solicitor@practice.test",
      role: "solicitor",
      title: "Associate"
    });

    expect(result.temporaryPassword).toBeTruthy();
    expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9_-]+$/);

    const signInResult = await signIn(handle.db, {
      email: "new-solicitor@practice.test",
      password: result.temporaryPassword as string
    });
    expect(signInResult.mustChangePassword).toBe(true);
    expect(signInResult.actor.role).toBe("solicitor");
  });

  it("lets an owner change another member's role and audits it", async () => {
    const targetRows = await handle.db
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.userId, solicitor.id));
    const membershipId = targetRows[0]?.id;
    expect(membershipId).toBeTruthy();

    await updateMemberRole(handle.db, owner.actor, membershipId as string, "principal");

    const audit = await handle.db
      .select({ action: auditEvents.action })
      .from(auditEvents)
      .where(eq(auditEvents.action, "user.role_changed"));
    expect(audit.length).toBeGreaterThan(0);
  });

  it("updates firm settings with validated values", async () => {
    await updateOrganisationSettings(handle.db, owner.actor, {
      name: "Practice Test Firm",
      matterNumberPrefix: "PT2",
      timezone: "Australia/Brisbane",
      financialYearStartMonth: 7
    });

    const organisation = await getOrganisation(handle.db, owner.actor);
    expect(organisation.matterNumberPrefix).toBe("PT2");
    expect(organisation.timezone).toBe("Australia/Brisbane");
  });

  it("refuses an invalid time zone", async () => {
    await expect(
      updateOrganisationSettings(handle.db, owner.actor, {
        name: "Practice Test Firm",
        matterNumberPrefix: "PT2",
        timezone: "Not/AZone",
        financialYearStartMonth: 7
      })
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("can sign in an established member with the original password", async () => {
    const result = await signIn(handle.db, {
      email: solicitor.email,
      password: TEST_PASSWORD
    });
    expect(result.actor.userId).toBe(solicitor.id);
    expect(result.actor.organisationId).toBe(firm.id);
  });
});
