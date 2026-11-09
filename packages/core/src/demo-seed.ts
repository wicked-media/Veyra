import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "@veyra/auth";
import type { VeyraDb } from "@veyra/database";
import {
  aiActionProposals,
  aiMessages,
  aiThreads,
  auditEvents,
  calendarEvents,
  clientAddresses,
  clientContacts,
  clients,
  deadlines,
  documentChunks,
  documentVersions,
  documents,
  matterMembers,
  matterParties,
  matters,
  matterSequences,
  matterWalls,
  memberships,
  offices,
  organisations,
  tasks,
  users
} from "@veyra/database";

/**
 * Development-only demonstration firm.
 *
 * This exists so the local application has a realistic workspace without a
 * production data import. It is guarded by the caller and must never run
 * against production data. All records are synthetic and clearly domain-scoped
 * to `.demo`.
 */
export const DEMO_EMAIL = "eleanor@marlowfinch.demo";
export const DEMO_PASSWORD = "Veyra!Demo2026";

export async function ensureDemoSeed(db: VeyraDb): Promise<{ seeded: boolean }> {
  const existing = await db.select({ id: organisations.id }).from(organisations).limit(1);
  if (existing.length > 0) return { seeded: false };

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
  const daysAhead = (days: number) => new Date(now.getTime() + days * 86_400_000);
  const isoDay = (days: number) => daysAhead(days).toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    const orgRows = await tx
      .insert(organisations)
      .values({
        name: "Marlow & Finch Legal",
        slug: "marlow-finch",
        timezone: "Australia/Sydney",
        matterNumberPrefix: "MF",
        financialYearStartMonth: 7,
        createdAt: daysAgo(210),
        updatedAt: now
      })
      .returning({ id: organisations.id });
    const organisationId = orgRows[0]?.id;
    if (!organisationId) throw new Error("Demo organisation insert failed");

    await tx.insert(offices).values([
      {
        organisationId,
        name: "Sydney",
        isPrimary: true,
        addressLine1: "Level 18, 1 Macquarie Place",
        suburb: "Sydney",
        state: "NSW",
        postcode: "2000"
      },
      {
        organisationId,
        name: "Parramatta",
        isPrimary: false,
        addressLine1: "Suite 6, 2 George Street",
        suburb: "Parramatta",
        state: "NSW",
        postcode: "2150"
      }
    ]);

    const userRows = await tx
      .insert(users)
      .values([
        {
          email: DEMO_EMAIL,
          name: "Eleanor Finch",
          passwordHash,
          mustChangePassword: false,
          createdAt: daysAgo(210)
        },
        {
          email: "daniel@marlowfinch.demo",
          name: "Daniel Okafor",
          passwordHash,
          createdAt: daysAgo(180)
        },
        {
          email: "priya@marlowfinch.demo",
          name: "Priya Nair",
          passwordHash,
          createdAt: daysAgo(140)
        },
        {
          email: "marcus@marlowfinch.demo",
          name: "Marcus Webb",
          passwordHash,
          createdAt: daysAgo(120)
        },
        {
          email: "sophie@marlowfinch.demo",
          name: "Sophie Nguyen",
          passwordHash,
          createdAt: daysAgo(95)
        }
      ])
      .returning({ id: users.id, email: users.email });

    const userId = (email: string): string => {
      const row = userRows.find((entry) => entry.email === email);
      if (!row) throw new Error(`Demo user missing: ${email}`);
      return row.id;
    };

    const eleanor = userId(DEMO_EMAIL);
    const daniel = userId("daniel@marlowfinch.demo");
    const priya = userId("priya@marlowfinch.demo");
    const marcus = userId("marcus@marlowfinch.demo");
    const sophie = userId("sophie@marlowfinch.demo");

    await tx.insert(memberships).values([
      { organisationId, userId: eleanor, role: "owner", title: "Managing Principal", joinedAt: daysAgo(210) },
      { organisationId, userId: daniel, role: "solicitor", title: "Senior Associate", joinedAt: daysAgo(180) },
      { organisationId, userId: priya, role: "paralegal", title: "Paralegal", joinedAt: daysAgo(140) },
      { organisationId, userId: marcus, role: "accounts", title: "Practice Manager, Finance", joinedAt: daysAgo(120) },
      { organisationId, userId: sophie, role: "admin", title: "Firm Administrator", joinedAt: daysAgo(95) }
    ]);

    const clientRows = await tx
      .insert(clients)
      .values([
        {
          organisationId,
          type: "organisation",
          displayName: "Harbourline Developments Pty Ltd",
          organisationName: "Harbourline Developments Pty Ltd",
          email: "tessa@harbourline.demo",
          phone: "(02) 9000 1140",
          abn: "42 123 456 789",
          riskRating: "medium",
          source: "Referral — Pinnacle Advisory",
          notes: "Property developer. Primary contact is the CFO, Tessa Morgan.",
          createdBy: eleanor,
          createdAt: daysAgo(90)
        },
        {
          organisationId,
          type: "individual",
          displayName: "Amelia Chen",
          firstName: "Amelia",
          lastName: "Chen",
          email: "amelia.chen@example.demo",
          phone: "0412 555 018",
          riskRating: "high",
          source: "Website enquiry",
          notes: "Litigation client. Prefers written correspondence.",
          createdBy: daniel,
          createdAt: daysAgo(60)
        },
        {
          organisationId,
          type: "individual",
          displayName: "Ravi & Sunita Patel",
          firstName: "Ravi",
          lastName: "Patel",
          email: "patels@example.demo",
          phone: "0407 222 903",
          riskRating: "low",
          source: "Existing client referral",
          createdBy: eleanor,
          createdAt: daysAgo(45)
        },
        {
          organisationId,
          type: "organisation",
          displayName: "Northbridge Coffee Co Pty Ltd",
          organisationName: "Northbridge Coffee Co Pty Ltd",
          email: "hello@northbridgecoffee.demo",
          phone: "(02) 8000 4455",
          abn: "55 987 654 321",
          riskRating: "low",
          source: "Local business network",
          createdBy: daniel,
          createdAt: daysAgo(200)
        },
        {
          organisationId,
          type: "individual",
          displayName: "Estate of Margaret Ellery",
          firstName: "Margaret",
          lastName: "Ellery",
          email: "clare.ellery@example.demo",
          phone: "0433 800 221",
          riskRating: "low",
          source: "Referral — Wills NSW",
          notes: "Executor is Clare Ellery, the deceased's daughter.",
          createdBy: eleanor,
          createdAt: daysAgo(30)
        }
      ])
      .returning({ id: clients.id, displayName: clients.displayName });

    const clientId = (name: string): string => {
      const row = clientRows.find((entry) => entry.displayName === name);
      if (!row) throw new Error(`Demo client missing: ${name}`);
      return row.id;
    };

    const harbourline = clientId("Harbourline Developments Pty Ltd");
    const chen = clientId("Amelia Chen");
    const patel = clientId("Ravi & Sunita Patel");
    const northbridge = clientId("Northbridge Coffee Co Pty Ltd");
    const ellery = clientId("Estate of Margaret Ellery");

    await tx.insert(clientContacts).values([
      {
        organisationId,
        clientId: harbourline,
        name: "Tessa Morgan",
        title: "Chief Financial Officer",
        email: "tessa@harbourline.demo",
        phone: "(02) 9000 1140",
        isPrimary: true
      },
      {
        organisationId,
        clientId: ellery,
        name: "Clare Ellery",
        title: "Executor",
        email: "clare.ellery@example.demo",
        phone: "0433 800 221",
        isPrimary: true
      }
    ]);

    await tx.insert(clientAddresses).values([
      {
        organisationId,
        clientId: harbourline,
        label: "Registered office",
        line1: "Level 9, 100 George Street",
        suburb: "Sydney",
        state: "NSW",
        postcode: "2000"
      },
      {
        organisationId,
        clientId: chen,
        label: "Home",
        line1: "12 Rosella Street",
        suburb: "Marrickville",
        state: "NSW",
        postcode: "2204"
      },
      {
        organisationId,
        clientId: patel,
        label: "Home",
        line1: "4/18 Park Avenue",
        suburb: "Chatswood",
        state: "NSW",
        postcode: "2067"
      }
    ]);

    const matterRows = await tx
      .insert(matters)
      .values([
        {
          organisationId,
          clientId: harbourline,
          matterNumber: "MF-2026-0001",
          title: "Harbourline — Northshore retail lease",
          description:
            "Negotiation and documentation of a 10-year retail lease at Northshore Plaza, including incentive and fit-out arrangements.",
          practiceArea: "commercial",
          matterType: "Commercial lease",
          status: "open",
          stage: "Negotiation",
          responsibleUserId: daniel,
          openedAt: daysAgo(72),
          createdBy: daniel,
          updatedAt: daysAgo(1)
        },
        {
          organisationId,
          clientId: ellery,
          matterNumber: "MF-2026-0002",
          title: "Estate of Margaret Ellery — probate",
          description: "Probate application and estate administration for the estate of Margaret Ellery.",
          practiceArea: "estates",
          matterType: "Probate",
          status: "open",
          stage: "Probate filed",
          responsibleUserId: eleanor,
          openedAt: daysAgo(28),
          createdBy: eleanor,
          updatedAt: daysAgo(2)
        },
        {
          organisationId,
          clientId: chen,
          matterNumber: "MF-2026-0003",
          title: "Chen v Ashcroft",
          description:
            "Supreme Court claim arising from a failed property joint venture. Restriction applied at client request.",
          practiceArea: "litigation",
          matterType: "Commercial litigation",
          status: "open",
          stage: "Discovery",
          responsibleUserId: daniel,
          restricted: true,
          openedAt: daysAgo(54),
          createdBy: daniel,
          updatedAt: daysAgo(1)
        },
        {
          organisationId,
          clientId: patel,
          matterNumber: "MF-2026-0004",
          title: "Patel — purchase of 14 Wilga Street",
          description: "Residential purchase, contract review and settlement preparation.",
          practiceArea: "conveyancing",
          matterType: "Residential purchase",
          status: "on_hold",
          stage: "Contract exchanged",
          responsibleUserId: eleanor,
          openedAt: daysAgo(21),
          createdBy: eleanor,
          updatedAt: daysAgo(4)
        },
        {
          organisationId,
          clientId: northbridge,
          matterNumber: "MF-2026-0005",
          title: "Northbridge Coffee — employment agreement review",
          description: "Review and negotiation of senior barista employment agreement.",
          practiceArea: "employment",
          matterType: "Employment advisory",
          status: "closed",
          stage: "Completed",
          responsibleUserId: daniel,
          openedAt: daysAgo(196),
          closedAt: daysAgo(188),
          createdBy: daniel,
          updatedAt: daysAgo(188)
        },
        {
          organisationId,
          clientId: harbourline,
          matterNumber: "MF-2026-0006",
          title: "Harbourline — Northshore option deed",
          description: "Drafting and negotiation of an option deed over the adjoining lot.",
          practiceArea: "commercial",
          matterType: "Property option",
          status: "open",
          stage: "Drafting",
          responsibleUserId: eleanor,
          openedAt: daysAgo(14),
          createdBy: eleanor,
          updatedAt: daysAgo(3)
        }
      ])
      .returning({ id: matters.id, matterNumber: matters.matterNumber });

    const matterId = (number: string): string => {
      const row = matterRows.find((entry) => entry.matterNumber === number);
      if (!row) throw new Error(`Demo matter missing: ${number}`);
      return row.id;
    };

    const leaseMatter = matterId("MF-2026-0001");
    const probateMatter = matterId("MF-2026-0002");
    const litigationMatter = matterId("MF-2026-0003");
    const conveyanceMatter = matterId("MF-2026-0004");
    const employmentMatter = matterId("MF-2026-0005");
    const optionMatter = matterId("MF-2026-0006");

    await tx.insert(matterMembers).values([
      { organisationId, matterId: leaseMatter, userId: daniel, role: "lead" },
      { organisationId, matterId: leaseMatter, userId: priya, role: "member" },
      { organisationId, matterId: probateMatter, userId: eleanor, role: "lead" },
      { organisationId, matterId: probateMatter, userId: priya, role: "member" },
      { organisationId, matterId: litigationMatter, userId: daniel, role: "lead" },
      { organisationId, matterId: litigationMatter, userId: eleanor, role: "member" },
      { organisationId, matterId: litigationMatter, userId: priya, role: "member" },
      { organisationId, matterId: conveyanceMatter, userId: eleanor, role: "lead" },
      { organisationId, matterId: conveyanceMatter, userId: priya, role: "member" },
      { organisationId, matterId: employmentMatter, userId: daniel, role: "lead" },
      { organisationId, matterId: optionMatter, userId: eleanor, role: "lead" },
      { organisationId, matterId: optionMatter, userId: daniel, role: "member" }
    ]);

    // Priya is a member of the litigation matter but is walled from it. The
    // wall must win over membership for reads and writes.
    await tx.insert(matterWalls).values({
      organisationId,
      matterId: litigationMatter,
      userId: priya,
      reason: "Conflict screen — family connection to the opposing party",
      createdBy: sophie,
      createdAt: daysAgo(50)
    });

    await tx.insert(matterParties).values([
      {
        organisationId,
        matterId: leaseMatter,
        name: "Northshore Retail Group Pty Ltd",
        role: "opposing",
        organisation: "Northshore Retail Group",
        email: "leasing@northshoreretail.demo"
      },
      {
        organisationId,
        matterId: leaseMatter,
        name: "Nadia Haddad",
        role: "counsel",
        organisation: "Eight Wentworth Chambers",
        email: "n.haddad@chambers.demo"
      },
      {
        organisationId,
        matterId: litigationMatter,
        name: "James Ashcroft",
        role: "opposing",
        email: "j.ashcroft@example.demo"
      },
      {
        organisationId,
        matterId: litigationMatter,
        name: "Marcus Hale",
        role: "counsel",
        organisation: "Tenth Floor Chambers"
      },
      {
        organisationId,
        matterId: conveyanceMatter,
        name: "Gregory & Diane Whitmore",
        role: "opposing",
        notes: "Vendors"
      },
      {
        organisationId,
        matterId: conveyanceMatter,
        name: "Westpac Banking Corporation",
        role: "related",
        notes: "Lender"
      },
      {
        organisationId,
        matterId: probateMatter,
        name: "Clare Ellery",
        role: "related",
        notes: "Executor and beneficiary"
      }
    ]);

    await tx.insert(tasks).values([
      {
        organisationId,
        matterId: leaseMatter,
        assigneeUserId: daniel,
        title: "Review draft lease amendments",
        priority: "high",
        dueOn: isoDay(2),
        createdBy: eleanor
      },
      {
        organisationId,
        matterId: leaseMatter,
        assigneeUserId: priya,
        title: "Prepare incentive package comparison",
        priority: "medium",
        dueOn: isoDay(5),
        createdBy: daniel
      },
      {
        organisationId,
        matterId: probateMatter,
        assigneeUserId: eleanor,
        title: "Lodge probate application",
        priority: "urgent",
        dueOn: isoDay(-1),
        createdBy: eleanor
      },
      {
        organisationId,
        matterId: probateMatter,
        assigneeUserId: priya,
        title: "Request estate bank statements",
        priority: "medium",
        dueOn: isoDay(3),
        createdBy: eleanor
      },
      {
        organisationId,
        matterId: litigationMatter,
        assigneeUserId: daniel,
        title: "Prepare discovery list",
        priority: "high",
        dueOn: isoDay(4),
        createdBy: daniel
      },
      {
        organisationId,
        matterId: litigationMatter,
        assigneeUserId: eleanor,
        title: "Brief counsel for discovery conference",
        priority: "medium",
        dueOn: isoDay(7),
        createdBy: daniel
      },
      {
        organisationId,
        matterId: conveyanceMatter,
        assigneeUserId: priya,
        title: "Order updated title search",
        priority: "high",
        dueOn: isoDay(1),
        createdBy: eleanor
      },
      {
        organisationId,
        matterId: conveyanceMatter,
        assigneeUserId: eleanor,
        title: "Confirm settlement adjustments",
        priority: "medium",
        dueOn: isoDay(10),
        createdBy: eleanor
      },
      {
        organisationId,
        matterId: employmentMatter,
        assigneeUserId: daniel,
        title: "Send executed agreement to client",
        status: "done",
        priority: "medium",
        dueOn: isoDay(-188),
        completedAt: daysAgo(188),
        createdBy: daniel
      },
      {
        organisationId,
        assigneeUserId: sophie,
        title: "Review professional indemnity renewal",
        priority: "medium",
        dueOn: isoDay(12),
        createdBy: sophie
      }
    ]);

    const seedDocuments = [
      {
        title: "Executed retail lease — Northshore Plaza",
        description: "Executed lease and incentive deed for the Northshore Plaza premises.",
        category: "contract" as const,
        matterId: leaseMatter,
        filename: "northshore-executed-lease.txt",
        content:
          "Clause 12 Option term. The tenant may exercise one further term of five years by written notice to the landlord no later than six months before the expiry of the initial term. Clause 8 Incentives. The landlord will contribute $480,000 towards the tenant fit-out, payable in three progress payments after practical completion. Clause 9 Permitted use is retail food and beverage. This is a synthetic demonstration document."
      },
      {
        title: "Lease amendments — mark-up",
        description: "Negotiation mark-up recording the option and incentive positions.",
        category: "contract" as const,
        matterId: leaseMatter,
        filename: "northshore-lease-markup.txt",
        content:
          "The tenant's mark-up proposes a seven-year option term instead of five years and an increased incentive contribution. The landlord has not agreed. The option notice period remains six months before expiry. Open items: incentive payment schedule, make-good obligations and assignment consent."
      },
      {
        title: "Probate application — filed copy",
        description: "Filed probate application and supporting inventory for the Ellery estate.",
        category: "court" as const,
        matterId: probateMatter,
        filename: "ellery-probate-filed.txt",
        content:
          "Supreme Court of New South Wales probate application for the estate of Margaret Ellery. The executor is Clare Ellery. The inventory records a residential property, a savings account and a small share portfolio. The grant application was filed after the required advertisement period. This is a synthetic demonstration document."
      },
      {
        title: "Estate administration checklist",
        description: "Internal checklist for the Ellery estate administration.",
        category: "advice" as const,
        matterId: probateMatter,
        filename: "ellery-estate-checklist.txt",
        content:
          "Outstanding estate administration steps: obtain the grant, notify the bank, collect the share portfolio, arrange valuation of the residential property, prepare the distribution statement and obtain executor sign-off. Do not distribute assets before the grant is obtained and the six-month creditor period is considered."
      },
      {
        title: "Northshore option deed — working draft",
        description: "Working draft of the option deed over the adjoining lot.",
        category: "contract" as const,
        matterId: optionMatter,
        filename: "northshore-option-deed-draft.txt",
        content:
          "Draft option deed for the adjoining lot. The option fee is $150,000, exercisable for 18 months after execution. The option term and notice mechanics remain subject to client instructions. The draft contains a condition requiring satisfactory due diligence and no material adverse change."
      }
    ];

    const documentRows = await tx
      .insert(documents)
      .values(
        seedDocuments.map((document) => ({
          organisationId,
          matterId: document.matterId,
          title: document.title,
          description: document.description,
          category: document.category,
          latestVersion: 1,
          searchText: `${document.title}\n${document.description}\n${document.filename}\n${document.content}`,
          createdBy: document.matterId === leaseMatter ? daniel : eleanor,
          createdAt: daysAgo(7),
          updatedAt: daysAgo(2)
        }))
      )
      .returning({ id: documents.id, title: documents.title });

    const documentIdByTitle = new Map(documentRows.map((row) => [row.title, row.id]));
    const versionRows = await tx
      .insert(documentVersions)
      .values(
        seedDocuments.map((document) => ({
          organisationId,
          documentId: documentIdByTitle.get(document.title) as string,
          versionNumber: 1,
          storageKey: `seed:${document.filename}`,
          originalFilename: document.filename,
          mimeType: "text/plain",
          sizeBytes: Buffer.byteLength(document.content, "utf8"),
          sha256: createHash("sha256").update(document.content).digest("hex"),
          extractedText: document.content,
          scanStatus: "clean" as const,
          scanProvider: "demo-seed",
          scanDetail: "Synthetic demonstration content",
          uploadedBy: document.matterId === leaseMatter ? daniel : eleanor,
          createdAt: daysAgo(7)
        }))
      )
      .returning({ id: documentVersions.id, documentId: documentVersions.documentId });

    await tx.insert(documentChunks).values(
      seedDocuments.map((document) => ({
        organisationId,
        matterId: document.matterId,
        documentId: documentIdByTitle.get(document.title) as string,
        versionId: versionRows.find(
          (version) => version.documentId === documentIdByTitle.get(document.title)
        )?.id as string,
        ordinal: 0,
        content: document.content,
        createdAt: daysAgo(7)
      }))
    );

    const atSydney = (days: number, hour: number, minute = 0): Date =>
      new Date(`${isoDay(days)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+10:00`);

    await tx.insert(calendarEvents).values([
      {
        organisationId,
        matterId: leaseMatter,
        title: "Northshore lease — client negotiation meeting",
        description: "Review open incentive and option terms with Tessa Morgan.",
        eventType: "meeting",
        startsAt: atSydney(2, 10),
        endsAt: atSydney(2, 11),
        location: "Level 18, 1 Macquarie Place",
        assignedUserId: daniel,
        createdBy: daniel
      },
      {
        organisationId,
        matterId: probateMatter,
        title: "Probate — directions mention",
        description: "List mention for the Ellery probate application.",
        eventType: "court_date",
        startsAt: atSydney(5, 9, 30),
        endsAt: atSydney(5, 10),
        location: "Supreme Court of NSW, Law Courts Building",
        assignedUserId: eleanor,
        createdBy: eleanor
      },
      {
        organisationId,
        matterId: null,
        title: "Firm practice meeting",
        description: "Weekly matter and workflow review.",
        eventType: "internal",
        startsAt: atSydney(1, 8, 30),
        endsAt: atSydney(1, 9, 15),
        allDay: false,
        location: "Sydney office — boardroom",
        createdBy: eleanor
      }
    ]);

    await tx.insert(deadlines).values([
      {
        organisationId,
        matterId: leaseMatter,
        title: "Option notice window opens",
        category: "statutory",
        dueOn: isoDay(21),
        status: "open",
        verification: "unverified",
        notes: "Confirm the lease commencement date and the six-month notice period before relying on this date.",
        createdBy: daniel
      },
      {
        organisationId,
        matterId: probateMatter,
        title: "Probate application — filing date",
        category: "filing",
        dueOn: isoDay(-3),
        status: "met",
        verification: "verified",
        verifiedBy: eleanor,
        verifiedAt: daysAgo(3),
        notes: "Verified against the court filing receipt.",
        createdBy: eleanor
      },
      {
        organisationId,
        matterId: conveyanceMatter,
        title: "Settlement — 14 Wilga Street",
        category: "filing",
        dueOn: isoDay(18),
        status: "open",
        verification: "unverified",
        notes: "Confirm with the conveyancing team and the lender.",
        createdBy: eleanor
      }
    ]);

    const leaseDocumentId = documentIdByTitle.get("Executed retail lease — Northshore Plaza") as string;
    const threadRows = await tx
      .insert(aiThreads)
      .values({
        organisationId,
        matterId: leaseMatter,
        title: "What does the executed lease say about the option term?",
        createdBy: daniel,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1)
      })
      .returning({ id: aiThreads.id });
    const threadId = threadRows[0]?.id;
    if (!threadId) throw new Error("Demo AI thread insert failed");

    await tx.insert(aiMessages).values([
      {
        organisationId,
        threadId,
        role: "user",
        content: "What does the executed lease say about the option term and the incentive?",
        createdAt: daysAgo(1)
      },
      {
        organisationId,
        threadId,
        role: "assistant",
        content:
          "The executed lease provides one further term of five years, exercisable by written notice no later than six months before the expiry of the initial term. It also records a $480,000 landlord contribution towards the tenant fit-out, payable in three progress payments. Open the cited lease and check the commencement date before calculating any notice deadline.",
        citations: [
          {
            id: "D1",
            documentId: leaseDocumentId,
            documentTitle: "Executed retail lease — Northshore Plaza",
            versionNumber: 1,
            ordinal: 0
          }
        ],
        provider: "demo-seed",
        model: "local-extractive",
        createdAt: daysAgo(1)
      }
    ]);

    const assistantRows = await tx
      .select({ id: aiMessages.id })
      .from(aiMessages)
      .where(
        and(eq(aiMessages.threadId, threadId), eq(aiMessages.role, "assistant"))
      )
      .limit(1);

    await tx.insert(aiActionProposals).values({
      organisationId,
      matterId: leaseMatter,
      threadId,
      messageId: assistantRows[0]?.id ?? null,
      actionType: "create_task",
      status: "pending",
      payload: {
        title: "Confirm option notice date with client",
        description:
          "Check the lease commencement date and diarise the six-month option notice window. Confirm instructions with Tessa Morgan before any notice is sent."
      },
      proposedBy: daniel,
      createdAt: daysAgo(1)
    });

    await tx.insert(matterSequences).values({
      organisationId,
      year: 2026,
      lastValue: 6,
      updatedAt: now
    });

    await tx.insert(auditEvents).values([
      {
        organisationId,
        actorUserId: eleanor,
        action: "organisation.settings_updated",
        entityType: "organisation",
        entityId: organisationId,
        metadata: { fields: ["matterNumberPrefix"] },
        createdAt: daysAgo(90)
      },
      {
        organisationId,
        actorUserId: daniel,
        action: "client.created",
        entityType: "client",
        entityId: harbourline,
        metadata: { displayName: "Harbourline Developments Pty Ltd" },
        createdAt: daysAgo(90)
      },
      {
        organisationId,
        actorUserId: daniel,
        action: "matter.created",
        entityType: "matter",
        entityId: leaseMatter,
        matterId: leaseMatter,
        metadata: { matterNumber: "MF-2026-0001" },
        createdAt: daysAgo(72)
      },
      {
        organisationId,
        actorUserId: daniel,
        action: "matter.created",
        entityType: "matter",
        entityId: litigationMatter,
        matterId: litigationMatter,
        metadata: { matterNumber: "MF-2026-0003" },
        createdAt: daysAgo(54)
      },
      {
        organisationId,
        actorUserId: daniel,
        action: "auth.signed_in",
        entityType: "session",
        createdAt: daysAgo(9)
      },
      {
        organisationId,
        actorUserId: priya,
        action: "task.created",
        entityType: "task",
        matterId: probateMatter,
        metadata: { title: "Request estate bank statements" },
        createdAt: daysAgo(6)
      },
      {
        organisationId,
        actorUserId: eleanor,
        action: "matter.created",
        entityType: "matter",
        entityId: probateMatter,
        matterId: probateMatter,
        metadata: { matterNumber: "MF-2026-0002" },
        createdAt: daysAgo(28)
      },
      {
        organisationId,
        actorUserId: eleanor,
        action: "matter.created",
        entityType: "matter",
        entityId: optionMatter,
        matterId: optionMatter,
        metadata: { matterNumber: "MF-2026-0006" },
        createdAt: daysAgo(14)
      },
      {
        organisationId,
        actorUserId: eleanor,
        action: "auth.signed_in",
        entityType: "session",
        createdAt: daysAgo(1)
      },
      {
        organisationId,
        actorUserId: daniel,
        action: "task.completed",
        entityType: "task",
        matterId: employmentMatter,
        metadata: { title: "Send executed agreement to client" },
        createdAt: daysAgo(188)
      }
    ]);

    await tx.insert(auditEvents).values({
      organisationId,
      actorUserId: sophie,
      action: "user.invited",
      entityType: "membership",
      metadata: { userId: marcus, role: "accounts", newAccount: true },
      createdAt: daysAgo(120)
    });

    await tx.insert(auditEvents).values({
      organisationId,
      actorUserId: sophie,
      action: "user.invited",
      entityType: "membership",
      metadata: { userId: sophie, role: "admin", newAccount: true },
      createdAt: daysAgo(95)
    });
  });

  return { seeded: true };
}
