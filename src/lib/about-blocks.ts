import { prisma } from "@/lib/prisma";
import type { AboutPageSection, AboutPageMedia } from "@/generated/prisma/client";

/**
 * `AboutPageSection` and `AboutPageMedia` (#59) are separate tables, but #72
 * needs them freely interleaved on the page — a video between two
 * paragraphs, say — so both draw `sortOrder` from one shared space instead
 * of two independent per-table sequences. No schema change needed, since
 * both already have their own `sortOrder Int`; this module is just the
 * merge-at-read-time layer plus the coordination for appending/reordering
 * across both tables.
 */

export type AboutBlock = ({ kind: "section" } & AboutPageSection) | ({ kind: "media" } & AboutPageMedia);

export async function getOrderedAboutBlocks(): Promise<AboutBlock[]> {
  const [sections, media] = await Promise.all([
    prisma.aboutPageSection.findMany(),
    prisma.aboutPageMedia.findMany(),
  ]);

  const blocks: AboutBlock[] = [
    ...sections.map((s): AboutBlock => ({ kind: "section", ...s })),
    ...media.map((m): AboutBlock => ({ kind: "media", ...m })),
  ];

  return blocks.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Next append-to-end sortOrder, shared across both tables. */
export async function nextAboutSortOrder(): Promise<number> {
  const blocks = await getOrderedAboutBlocks();
  if (blocks.length === 0) return 0;
  return blocks[blocks.length - 1].sortOrder + 1;
}

/** No-ops if `id`/`kind` doesn't have a neighbor in that direction (already first/last). */
export async function moveAboutBlock(kind: "section" | "media", id: string, direction: "up" | "down"): Promise<void> {
  const blocks = await getOrderedAboutBlocks();
  const index = blocks.findIndex((b) => b.kind === kind && b.id === id);
  if (index === -1) return;

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  const neighbor = blocks[neighborIndex];
  if (!neighbor) return;

  const current = blocks[index];

  await prisma.$transaction([
    prismaUpdateSortOrder(current, neighbor.sortOrder),
    prismaUpdateSortOrder(neighbor, current.sortOrder),
  ]);
}

function prismaUpdateSortOrder(block: AboutBlock, sortOrder: number) {
  return block.kind === "section"
    ? prisma.aboutPageSection.update({ where: { id: block.id }, data: { sortOrder } })
    : prisma.aboutPageMedia.update({ where: { id: block.id }, data: { sortOrder } });
}
