import type {Request, Response, NextFunction} from "express";
import {z} from "zod";

// ---------------------------------------------------------------------------
// Express type augmentation
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown;
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}



/**
 * Factory that returns an Express middleware which validates `req[source]`
 * against the provided Zod schema.
 *
 * On failure, flattens the Zod error with `z.flattenError` and forwards a
 * tagged plain `Error` to `next`. The tag (`isValidationError: true`) lets
 * the global error handler detect validation failures without relying on a
 * custom error class.
 *
 * On success, stores the parsed (and coerced) data on `req.validatedBody`,
 * `req.validatedQuery`, or `req.validatedParams` (depending on `source`).
 * Downstream handlers must read from those properties instead of raw
 * `req.body` / `req.query` / `req.params`.
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

    if (source === "body") {
      req.validatedBody = result.data;
    } else if (source === "query") {
      req.validatedQuery = result.data;
    } else if (source === "params") {
      req.validatedParams = result.data;
    }
    next();
  };
}
