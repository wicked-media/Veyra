import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  approveAiProposal,
  askMatterQuestion,
  createCalendarEvent,
  createDeadline,
  createLocalValidationScanner,
  getAiWorkspace,
  getDocumentDownload,
  listCalendar,
  listDocuments,
  listMatterDocuments,
  LocalDocumentStorage,
  uploadDocument,
  verifyDeadline
} from "@veyra/core";
import { tasks, type DatabaseHandle } from "@veyra/database";
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
let firm: TestFirm;
let owner: TestUser;
let principal: TestUser;
let outsider: TestUser;
let clientId: string;
let matterId: string;
let restrictedMatterId: string;
let storageRoot: string;
let storage: LocalDocumentStorage;
let documentId: string;
let documentVersionId: string;

const leaseText =
  "Clause 12 Option term. The tenant may exercise one further term of five years by written notice no later than six months before the expiry of the initial term. Clause 8 Incentives. The landlord will contribute $480,000 towards the fit-out in three progress payments. Clause 9 Permitted use is retail food and beverage.";

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("VEYRA_AI_LOCAL", "true");

  handle = await createTestDatabase();
  firm = await createFirm(handle.db, {
    name: "Stage 3 and 4 Firm",
    slug: "stage-3-4",
    prefix: "S34"
  });
  owner = await createMember(handle.db, firm, {
    email: "owner@stage34.test",
    name: "Olivia Owner",
    role: "owner"
  });
  principal = await createMember(handle.db, firm, {
    email: "principal@stage34.test",
    name: "Pia Principal",
    role: "principal"
  });
  outsider = await createMember(handle.db, firm, {
    email: "outsider@stage34.test",
    name: "Owen Outsider",
    role: "solicitor"
  });
  const client = await createClientFixture(handle.db, firm, {
    displayName: "Stage 3 Client",
    type: "organisation"
  });
  clientId = client.id;

  const matter = await createMatterFixture(handle.db, firm, {
    clientId,
    responsibleUserId: principal.id,
    matterNumber: "S34-2026-0001",
    title: "Northshore lease",
    restricted: true,
    teamUserIds: [owner.id]
  });
  matterId = matter.id;

  const restricted = await createMatterFixture(handle.db, firm, {
    clientId,
    responsibleUserId: principal.id,
    matterNumber: "S34-2026-0002",
    title: "Restricted matter",
    restricted: true
  });
  restrictedMatterId = restricted.id;

  storageRoot = await mkdtemp(path.join(os.tmpdir(), "veyra-stage34-"));
  storage = new LocalDocumentStorage(storageRoot);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await handle.close();
  await rm(storageRoot, { recursive: true, force: true });
});

describe("documents and calendar", () => {
  it("uploads a private versioned document, chunks it and authorises downloads", async () => {
    const result = await uploadDocument(
      handle.db,
      owner.actor,
      {
        matterId,
        title: "Executed lease",
        description: "Synthetic lease for testing.",
        category: "contract",
        bytes: Buffer.from(leaseText, "utf8"),
        filename: "lease.txt",
        mimeType: "text/plain"
      },
      storage,
      createLocalValidationScanner()
    );
    documentId = result.documentId;
    documentVersionId = result.versionId;

    const documents = await listMatterDocuments(handle.db, owner.actor, matterId);
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      id: documentId,
      latestVersion: 1,
      latestVersionId: documentVersionId,
      scanStatus: "clean"
    });

    const download = await getDocumentDownload(handle.db, owner.actor, documentVersionId);
    expect(download.title).toBe("Executed lease");
    expect(download.extractedText).toContain("Option term");
    expect(await storage.get(download.storageKey)).toEqual(Buffer.from(leaseText, "utf8"));
    expect(await listDocuments(handle.db, outsider.actor, { q: "lease" })).toHaveLength(0);
    await expect(listMatterDocuments(handle.db, outsider.actor, matterId)).rejects.toMatchObject({
      code: "NOT_FOUND"
    });
    await expect(
      getDocumentDownload(handle.db, outsider.actor, documentVersionId)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps versions immutable and rejects an unauthorised upload", async () => {
    const result = await uploadDocument(
      handle.db,
      owner.actor,
      {
        matterId,
        documentId,
        title: "Executed lease",
        description: "Synthetic lease for testing.",
        category: "contract",
        bytes: Buffer.from(`${leaseText}\nAmendment: the option term is unchanged.`, "utf8"),
        filename: "lease-v2.txt",
        mimeType: "text/plain"
      },
      storage,
      createLocalValidationScanner()
    );
    expect(result.versionNumber).toBe(2);
    const [document] = await listMatterDocuments(handle.db, owner.actor, matterId);
    expect(document?.latestVersion).toBe(2);
    expect(document?.versionCount).toBe(2);

    await expect(
      uploadDocument(
        handle.db,
        outsider.actor,
        {
          matterId,
          title: "Unauthorised",
          description: null,
          category: "general",
          bytes: Buffer.from("not allowed", "utf8"),
          filename: "no.txt",
          mimeType: "text/plain"
        },
        storage,
        createLocalValidationScanner()
      )
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("records calendar events and requires human verification for deadlines", async () => {
    await createCalendarEvent(handle.db, principal.actor, {
      matterId,
      title: "Directions hearing",
      description: null,
      eventType: "hearing",
      startsAt: new Date("2026-12-01T00:00:00.000Z"),
      endsAt: new Date("2026-12-01T01:00:00.000Z"),
      allDay: false,
      location: "Supreme Court",
      assignedUserId: owner.id
    });
    const deadline = await createDeadline(handle.db, principal.actor, {
      matterId,
      title: "File evidence",
      category: "court",
      dueOn: "2026-12-10",
      notes: "Check the court order before relying on this date."
    });

    const data = await listCalendar(handle.db, principal.actor, { matterId });
    expect(data.events).toHaveLength(1);
    expect(data.deadlines[0]).toMatchObject({ verification: "unverified", status: "open" });

    await expect(
      verifyDeadline(handle.db, outsider.actor, deadline.id)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await verifyDeadline(handle.db, owner.actor, deadline.id);

    const verified = await listCalendar(handle.db, principal.actor, { matterId });
    expect(verified.deadlines[0]).toMatchObject({
      verification: "verified",
      verifiedByName: owner.name
    });
  });

  it("hides a restricted matter's documents and calendar from non-members", async () => {
    await addEthicalWall(handle.db, firm, matterId, outsider.id, "Test wall");
    const visible = await listDocuments(handle.db, outsider.actor, { status: "all" });
    expect(visible.every((document) => document.matterId !== matterId)).toBe(true);
    await expect(listCalendar(handle.db, outsider.actor, { matterId })).rejects.toMatchObject({
      code: "NOT_FOUND"
    });
  });

  it("retrieves only from the requested matter and validates citations", async () => {
    const answer = await askMatterQuestion(handle.db, principal.actor, {
      matterId,
      question:
        "What does the lease say about the option term? Create a task to confirm the notice date."
    });

    expect(answer.proposalId).toBeTruthy();
    const workspace = await getAiWorkspace(handle.db, principal.actor, answer.threadId);
    const assistant = workspace.messages.find((message) => message.role === "assistant");
    expect(assistant?.citations.length).toBeGreaterThan(0);
    expect(assistant?.citations.every((citation) => citation.documentId === documentId)).toBe(true);
    expect(workspace.proposals[0]).toMatchObject({
      status: "pending",
      proposedBy: principal.id,
      actionType: "create_task"
    });

    if (!answer.proposalId) throw new Error("Expected a proposed task");
    await expect(
      approveAiProposal(handle.db, principal.actor, answer.proposalId, null)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const approved = await approveAiProposal(
      handle.db,
      owner.actor,
      answer.proposalId,
      "Checked against the lease."
    );
    const taskRows = await handle.db.select().from(tasks).where(eq(tasks.id, approved.taskId));
    expect(taskRows[0]).toMatchObject({ matterId, title: expect.stringContaining("option term") });
  });

  it("does not retrieve a document from a restricted matter", async () => {
    await uploadDocument(
      handle.db,
      principal.actor,
      {
        matterId: restrictedMatterId,
        title: "Restricted secret",
        description: null,
        category: "evidence",
        bytes: Buffer.from(
          "The restricted option term says something that must never appear in another matter.",
          "utf8"
        ),
        filename: "restricted.txt",
        mimeType: "text/plain"
      },
      storage,
      createLocalValidationScanner()
    );

    const answer = await askMatterQuestion(handle.db, principal.actor, {
      matterId,
      question: "What does the restricted secret say about the option term?"
    });
    const workspace = await getAiWorkspace(handle.db, principal.actor, answer.threadId);
    const citations = workspace.messages.flatMap((message) => message.citations);
    expect(citations.every((citation) => citation.documentId !== restrictedMatterId)).toBe(true);
  });
});
