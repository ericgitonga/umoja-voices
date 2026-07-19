// Demo/dev seed data only. Real choir member names and the WhatsApp export
// under Media/ are never used here — see SKILL.md's data handling rules.
// The one fictitious demo chorister below plays the same role as "Alex
// Mercer" does in the Career Transition project: a safe, reusable example.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { stripSslMode } from "../src/lib/db-url";
import bcrypt from "bcryptjs";

const rawConnectionString = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error("Neither POSTGRES_PRISMA_URL nor DATABASE_URL is set — see .env.example.");
}

// See src/lib/db-url.ts for why sslmode must be stripped and ssl set explicitly.
const adapter = new PrismaPg({
  connectionString: stripSslMode(rawConnectionString),
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = "admin12345";
  const choristerPassword = "chorister12345";

  const admin = await prisma.user.upsert({
    where: { email: "gitonga@gmail.com" },
    update: {},
    create: {
      email: "gitonga@gmail.com",
      name: "Eric Gitonga",
      role: "admin",
      status: "active",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      mustChangePassword: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "demo.chorister@example.com" },
    update: {},
    create: {
      email: "demo.chorister@example.com",
      name: "Demo Chorister",
      role: "chorister",
      status: "active",
      passwordHash: await bcrypt.hash(choristerPassword, 12),
      mustChangePassword: true,
    },
  });

  const linkCount = await prisma.externalLink.count();
  if (linkCount === 0) {
    await prisma.externalLink.createMany({
      data: [
        {
          title: "Instagram",
          url: "https://www.instagram.com/umojavoices/",
          category: "social",
          sortOrder: 0,
        },
      ],
    });
  }

  const songCount = await prisma.song.count();
  if (songCount === 0) {
    const song = await prisma.song.create({
      data: {
        title: "Rising Together (demo song)",
        createdById: admin.id,
        sections: {
          create: [
            {
              part: "S",
              sectionLabel: "Soprano",
              labelDescription: "",
              sortOrder: 0,
              media: { create: [{ label: "Soprano", mediaUrl: "https://youtu.be/dQw4w9WgXcQ", mediaKind: "youtube", sortOrder: 0 }] },
            },
            {
              part: "A",
              sectionLabel: "Alto",
              labelDescription: "",
              sortOrder: 1,
              media: { create: [{ label: "Alto", mediaUrl: "https://youtu.be/dQw4w9WgXcQ", mediaKind: "youtube", sortOrder: 0 }] },
            },
            {
              part: "T",
              sectionLabel: "Tenor",
              labelDescription: "",
              sortOrder: 2,
              media: { create: [{ label: "Tenor", mediaUrl: "https://youtu.be/dQw4w9WgXcQ", mediaKind: "youtube", sortOrder: 0 }] },
            },
            {
              part: "B",
              sectionLabel: "Bass",
              labelDescription: "",
              sortOrder: 3,
              media: { create: [{ label: "Bass", mediaUrl: "https://youtu.be/dQw4w9WgXcQ", mediaKind: "youtube", sortOrder: 0 }] },
            },
            {
              part: "All",
              sectionLabel: "SATB",
              labelDescription: "Required for all members, closing set.",
              sortOrder: 4,
              media: { create: [{ label: "Full choir", mediaUrl: "https://youtu.be/dQw4w9WgXcQ", mediaKind: "youtube", sortOrder: 0 }] },
            },
          ],
        },
        lyricSections: {
          create: [
            {
              sectionType: "verse",
              sectionLabel: "Verse 1",
              content: "Placeholder verse lyrics go here, line by line,\nready to be replaced with the real song.",
              voiceTags: "SATB",
              sortOrder: 0,
            },
            {
              sectionType: "chorus",
              sectionLabel: "Chorus",
              content: "Placeholder chorus lyrics,\nsung by everyone together.",
              voiceTags: "SATB",
              sortOrder: 1,
            },
            {
              sectionType: "bridge",
              sectionLabel: "Bridge (Soprano descant)",
              content: "Placeholder descant line for sopranos only.",
              voiceTags: "S",
              sortOrder: 2,
            },
          ],
        },
      },
    });
    console.log(`Seeded demo song: ${song.title}`);
  }

  const tripCount = await prisma.trip.count();
  if (tripCount === 0) {
    const trip = await prisma.trip.create({
      data: {
        title: "Portugal & Germany Tour 2026",
        destination: "Portugal & Germany",
        startDate: new Date("2026-10-07"),
        endDate: new Date("2026-10-18"),
        status: "upcoming",
        createdById: admin.id,
        deadlines: {
          create: [
            {
              category: "visa",
              label: "Visa application deadline",
              dueDate: new Date("2026-09-05"),
              notes: "Submit passport and supporting documents.",
              sortOrder: 0,
            },
            {
              category: "tickets",
              label: "Book flights by",
              dueDate: new Date("2026-08-15"),
              sortOrder: 1,
            },
          ],
        },
        itineraryItems: {
          create: [
            { date: new Date("2026-10-07"), title: "Depart Nairobi", sortOrder: 0 },
            { date: new Date("2026-10-08"), title: "Arrive Lisbon", location: "Lisbon, Portugal", sortOrder: 1 },
            { date: new Date("2026-10-10"), title: "Joint concert with Lisbon Community Choir", location: "Lisbon, Portugal", sortOrder: 2 },
            { date: new Date("2026-10-14"), title: "Travel to Germany", sortOrder: 3 },
            { date: new Date("2026-10-16"), title: "Berlin concert", location: "Berlin, Germany", sortOrder: 4 },
            { date: new Date("2026-10-18"), title: "Return to Nairobi", sortOrder: 5 },
          ],
        },
        practiceSessions: {
          create: [
            { date: new Date("2026-08-06"), time: "17:30", location: "Rehearsal venue — TBC, see admin", sortOrder: 0 },
            { date: new Date("2026-08-20"), time: "17:30", location: "Rehearsal venue — TBC, see admin", sortOrder: 1 },
          ],
        },
      },
    });
    console.log(`Seeded trip: ${trip.title}`);
  }

  console.log("\nSeed complete. Dev login credentials (both must be changed on first login):");
  console.log(`  Admin:      gitonga@gmail.com / ${adminPassword}`);
  console.log(`  Chorister:  demo.chorister@example.com / ${choristerPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
