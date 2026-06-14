import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Factory that returns an Express middleware which validates `req[source]`
 * against the provided Zod schema.
 *
 * On failure, flattens the Zod error with `z.flattenError` and forwards a
 * tagged plain `Error` to `next`. The tag (`isValidationError: true`) lets
 * the global error handler detect validation failures without relying on a
 * custom error class.
 *
 * On success, replaces `req[source]` with the parsed (and coerced) data so
 * that downstream handlers receive the transformed values.
 *
 * @param schema - A Zod schema to validate the request data against.
 * @param source - Which part of the request to validate (`"body"`, `"query"`, or `"params"`). Defaults to `"body"`.
 * @returns Express middleware function.
 */
export function validate(
  schema: z.ZodTypeAny,
  source: "body" | "query" | "params" = "body",
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const flattened = z.flattenError(result.error);
      const error = Object.assign(new Error("Validation failed"), {
        statusCode: 400,
        isValidationError: true as const,
        errors: flattened.fieldErrors,
      });
      next(error);
      return;
    }

    // Overwrite req[source] with coerced/transformed data
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
