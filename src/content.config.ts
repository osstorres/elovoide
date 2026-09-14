import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const teamAbbr = z
  .string()
  .regex(/^[A-Z]{2,4}$/, 'Use the team abbreviation, e.g. KC, BUF, WSH');

const outcome = z.enum(['win', 'loss', 'push', 'pending']);

/**
 * Weekly picks. One Markdown file per week:
 *   src/content/picks/es/2026-w01.md
 * The body is the week's intro/overview; each game lives in `games`.
 */
const picks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/picks' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    season: z.number().int(),
    week: z.number().int().min(1).max(22),
    published: z.coerce.date(),
    draft: z.boolean().default(false),
    games: z
      .array(
        z.object({
          away: teamAbbr,
          home: teamAbbr,
          pick: teamAbbr,
          spread: z.string().optional(),
          confidence: z.number().int().min(1).max(5).default(3),
          analysis: z.string().optional(),
          context: z.string().optional(),
          data: z.array(z.string()).default([]),
          // Leave `result` out and the build fills it from the final score.
          result: z
            .object({
              awayScore: z.number().int().optional(),
              homeScore: z.number().int().optional(),
              outcome,
              note: z.string().optional(),
            })
            .optional(),
        }),
      )
      .default([]),
  }),
});

/** One entry per week in src/content/survivor.yaml */
const survivor = defineCollection({
  loader: file('./src/content/survivor.yaml'),
  schema: z.object({
    season: z.number().int(),
    week: z.number().int().min(1).max(22),
    team: teamAbbr,
    opponent: teamAbbr,
    home: z.boolean().default(true),
    why: z.string().optional(),
    // Leave out to auto-resolve from the final score.
    outcome: outcome.optional(),
  }),
});

/** Memes: drop an image in src/content/memes/ and describe it here. */
const memes = defineCollection({
  loader: file('./src/content/memes/memes.yaml'),
  schema: ({ image }) =>
    z.object({
      image: image(),
      date: z.coerce.date(),
      week: z.number().int().optional(),
      caption: z.string(),
      alt: z.string(),
    }),
});

export const collections = { picks, survivor, memes };
