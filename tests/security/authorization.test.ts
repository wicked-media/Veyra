import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditEvents, tasks, type DatabaseHandle } from "@veyra/database";
import {
  createMatter,
  createTask,
  getClientWorkspace,
  getDashboard,
  getMatterWorkspace,
  listAuditEvents,
  listClients,
  listMatters,
  listTasks,
  updateMatter
} from "@veyra/core";
import {
  addEthicalWall,
  createClientFixture,
  createFirm,
  createMatterFixture,
  createMember,
  createTestDatabase,
  type TestFirm,
  type TestUser
} from "../helpers";

let handle: DatabaseHandle;
let alpha: TestFirm;
let beta: TestFirm;
let alphaOwner: TestUser;
let alphaSolicitor: TestUser;
let alphaAdmin: TestUser;
let alphaParalegal: TestUser;
let betaOwner: TestUser;
let alphaClient: { id: string; displayName: string };
let betaClient: { id: string; displayName: string };
let openMatter: { id: string; matterNumber: string };
let restrictedMatter: { id: string; matterNumber: string };
let walledMatter: { id: string; matterNumber: string };
let betaMatter: { id: string; matterNumber: string };

beforeAll(async () => {
  handle = await createTestDatabase();
  const db = handle.db;

  alpha = await createFirm(db, { name: "Alpha Legal", slug: "alpha-legal", prefix: "ALP" });
  beta = await createFirm(db, { name: "Beta Law", slug: "beta-law", prefix: "BET" });

  alphaOwner = await createMember(db, alpha, {
    email: "owner@alpha.test",
    name: "Alex Alpha",
    role: "owner"
  });
  alphaSolicitor = await createMember(db, alpha, {
    email: "solicitor@alpha.test",
    name: "Sam Solicitor",
    role: "solicitor"
  });
  alphaAdmin = await createMember(db, alpha, {
    email: "admin@alpha.test",
    name: "Avery Admin",
    role: "admin"
  });
  alphaParalegal = await createMember(db, alpha, {
    email: "paralegal@alpha.test",
    name: "Parker Paralegal",
    role: "paralegal"
  });
  betaOwner = await createMember(db, beta, {
    email: "owner@beta.test",
    name: "Blair Beta",
    role: "owner"
  });

  alphaClient = await createClientFixture(db, alpha, {
    displayName: "Alpha Client",
    email: "client@alpha.test"
  });
  betaClient = await createClientFixture(db, beta, {
    displayName: "Beta Client",
    email: "client@beta.test"
  });

  openMatter = await createMatterFixture(db, alpha, {
    clientId: alphaClient.id,
    responsibleUserId: alphaSolicitor.id,
    matterNumber: "ALP-2026-0001",
    title: "Alpha open commercial matter",
    teamUserIds: [alphaOwner.id, alphaParalegal.id]
  });
  restrictedMatter = await createMatterFixture(db, alpha, {
    clientId: alphaClient.id,
    responsibleUserId: alphaSolicitor.id,
    matterNumber: "ALP-2026-0002",
    title: "Alpha restricted litigation matter",
    restricted: true,
    practiceArea: "litigation",
    teamUserIds: [alphaAdmin.id]
  });
  walledMatter = await createMatterFixture(db, alpha, {
    clientId: alphaClient.id,
    responsibleUserId: alphaSolicitor.id,
    matterNumber: "ALP-2026-0003",
    title: "Alpha walled family matter",
    practiceArea: "family",
    teamUserIds: [alphaAdmin.id]
  });
  betaMatter = await createMatterFixture(db, beta, {
    clientId: betaClient.id,
    responsibleUserId: betaOwner.id,
    matterNumber: "BET-2026-0001",
    title: "Beta matter"
  });

  await addEthicalWall(db, alpha, walledMatter.id, alphaSolicitor.id);
  await addEthicalWall(db, alpha, walledMatter.id, alphaAdmin.id);
  await addEthicalWall(db, alpha, walledMatter.id, alphaOwner.id);

  await db.insert(tasks).values([
    {
      organisationId: alpha.id,
      matterId: openMatter.id,
      assigneeUserId: alphaSolicitor.id,
      title: "Open matter task",
      createdBy: alphaSolicitor.id
    },
    {
      organisationId: alpha.id,
      matterId: restrictedMatter.id,
      assigneeUserId: alphaSolicitor.id,
      title: "Restricted matter task",
      createdBy: alphaSolicitor.id
    },
    {
      organisationId: alpha.id,
      matterId: walledMatter.id,
      assigneeUserId: alphaSolicitor.id,
      title: "Walled matter task",
      createdBy: alphaSolicitor.id
    },
    {
      organisationId: beta.id,
      matterId: betaMatter.id,
      assigneeUserId: betaOwner.id,
      title: "Beta matter task",
      createdBy: betaOwner.id
    }
  ]);

  await db.insert(auditEvents).values([
    {
      organisationId: alpha.id,
      actorUserId: alphaOwner.id,
      action: "test.open_matter",
      entityType: "matter",
      entityId: openMatter.id,
      matterId: openMatter.id
    },
    {
      organisationId: alpha.id,
      actorUserId: alphaOwner.id,
      action: "test.restricted_matter",
      entityType: "matter",
      entityId: restrictedMatter.id,
      matterId: restrictedMatter.id
    },
    {
      organisationId: alpha.id,
      actorUserId: alphaOwner.id,
      action: "test.walled_matter",
      entityType: "matter",
      entityId: walledMatter.id,
      matterId: walledMatter.id
    },
    {
      organisationId: beta.id,
      actorUserId: betaOwner.id,
      action: "test.beta_matter",
      entityType: "matter",
      entityId: betaMatter.id,
      matterId: betaMatter.id
    }
  ]);
});

afterAll(async () => {
  await handle.close();
});

describe("tenant isolation", () => {
  it("only lists matters owned by the actor's firm", async () => {
    const rows = await listMatters(handle.db, betaOwner.actor, { status: "all" });
    expect(rows.map((row) => row.id)).toEqual([betaMatter.id]);
    expect(rows.some((row) => row.id === openMatter.id)).toBe(false);
  });

  it("does not leak another firm's matter through search", async () => {
    const rows = await listMatters(handle.db, betaOwner.actor, {
      status: "all",
      q: "Alpha open"
    });
    expect(rows).toHaveLength(0);
  });

  it("returns 404, not 403, for a matter in another firm", async () => {
    await expect(
      getMatterWorkspace(handle.db, betaOwner.actor, openMatter.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("does not expose another firm's client workspace", async () => {
    await expect(
      getClientWorkspace(handle.db, betaOwner.actor, alphaClient.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("scopes client lists to the firm", async () => {
    const rows = await listClients(handle.db, betaOwner.actor, { status: "all" });
    expect(rows.map((row) => row.id)).toEqual([betaClient.id]);
  });

  it("does not create a matter using a client from another firm", async () => {
    await expect(
      createMatter(handle.db, alphaOwner.actor, {
        clientId: betaClient.id,
        title: "Cross-tenant matter attempt",
        description: null,
        practiceArea: "commercial",
        matterType: null,
        stage: null,
        responsibleUserId: alphaOwner.id,
        restricted: false
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("restricted matters and ethical walls", () => {
  it("hides a restricted matter from an owner who is not on the team", async () => {
    const rows = await listMatters(handle.db, alphaOwner.actor, { status: "all" });
    expect(rows.map((row) => row.id)).not.toContain(restrictedMatter.id);

    await expect(
      getMatterWorkspace(handle.db, alphaOwner.actor, restrictedMatter.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("shows a restricted matter to an explicit team member", async () => {
    const workspace = await getMatterWorkspace(handle.db, alphaSolicitor.actor, restrictedMatter.id);
    expect(workspace.matter.restricted).toBe(true);
    expect(workspace.matter.id).toBe(restrictedMatter.id);
  });

  it("denies a walled user even when they are on the matter team", async () => {
    const rows = await listMatters(handle.db, alphaSolicitor.actor, { status: "all" });
    expect(rows.map((row) => row.id)).not.toContain(walledMatter.id);

    await expect(
      getMatterWorkspace(handle.db, alphaSolicitor.actor, walledMatter.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("denies a walled firm administrator, so walls beat role privilege", async () => {
    const rows = await listMatters(handle.db, alphaAdmin.actor, { status: "all" });
    expect(rows.map((row) => row.id)).not.toContain(walledMatter.id);

    await expect(
      getMatterWorkspace(handle.db, alphaAdmin.actor, walledMatter.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("denies writes through a wall, not just reads", async () => {
    await expect(
      createTask(handle.db, alphaSolicitor.actor, {
        title: "Attempted walled task",
        description: null,
        matterId: walledMatter.id,
        assigneeUserId: alphaSolicitor.id,
        priority: "medium",
        dueOn: null
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      updateMatter(handle.db, alphaSolicitor.actor, walledMatter.id, { title: "Changed" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("requires matter:create, not just matter:read, to open a matter", async () => {
    await expect(
      createMatter(handle.db, alphaParalegal.actor, {
        clientId: alphaClient.id,
        title: "Paralegal matter attempt",
        description: null,
        practiceArea: "other",
        matterType: null,
        stage: null,
        responsibleUserId: alphaParalegal.id,
        restricted: false
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("filters tasks through matter visibility", async () => {
    const solicitorTasks = await listTasks(handle.db, alphaSolicitor.actor, { status: "all" });
    expect(solicitorTasks.map((row) => row.title)).toEqual(
      expect.arrayContaining(["Open matter task", "Restricted matter task"])
    );
    expect(solicitorTasks.map((row) => row.title)).not.toContain("Walled matter task");

    const adminTasks = await listTasks(handle.db, alphaAdmin.actor, { status: "all" });
    expect(adminTasks.map((row) => row.title)).not.toContain("Walled matter task");
  });

  it("filters audit history through matter visibility", async () => {
    const ownerEvents = await listAuditEvents(handle.db, alphaOwner.actor, { limit: 100 });
    const ownerActions = ownerEvents.map((event) => event.action);
    expect(ownerActions).toContain("test.open_matter");
    expect(ownerActions).not.toContain("test.restricted_matter");
    expect(ownerActions).not.toContain("test.walled_matter");

    const adminEvents = await listAuditEvents(handle.db, alphaAdmin.actor, { limit: 100 });
    const adminActions = adminEvents.map((event) => event.action);
    expect(adminActions).toContain("test.restricted_matter");
    expect(adminActions).not.toContain("test.walled_matter");
  });

  it("keeps dashboard counters inside matter visibility", async () => {
    const dashboard = await getDashboard(handle.db, alphaOwner.actor);
    expect(dashboard.counts.openMatters).toBe(1);
    expect(dashboard.recentMatters.map((row) => row.id)).not.toContain(restrictedMatter.id);
  });
});
