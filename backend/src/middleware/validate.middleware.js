import { ApiError } from "../utils/ApiHelpers.js";

// Fields a client must NEVER be able to set. The server decides them (from the logged-in
// user), but several controllers do `Model.create({ ownerId: req.ownerId, ...req.body })` —
// without this, a client could send its own `ownerId` and write into ANOTHER institute's data.
// (`refreshToken` is deliberately not listed: /auth/refresh-token reads it from the body.)
const PROTECTED_BODY_KEYS = ["_id", "__v", "ownerId", "createdBy", "collectedBy", "createdAt", "updatedAt"];

export const validate = (schema) => (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const key of PROTECTED_BODY_KEYS) delete req.body[key];
  }
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message.replace(/"/g, "")).join(", ");
    return next(new ApiError(400, messages));
  }
  next();
};
