import { z } from 'zod';

export const scanUrlSchema = z.object({
  body: z.object({
    url: z.string().trim().min(1, 'Enter a link to check.').max(2048, 'Links must be 2,048 characters or shorter.'),
    allowExternalLookup: z.boolean().optional().default(false)
  }).strict()
});
