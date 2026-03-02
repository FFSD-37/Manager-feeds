export const requireManagerTypes = (allowedTypes = []) => {
  return (req, res, next) => {
    let managerType = req.actor?.managerType;

    // Normalize manager type (handle plural variants)
    if (managerType === "users") managerType = "user";
    if (managerType === "channels") managerType = "channel";
    if (managerType === "kids") managerType = "kids"; // already correct
    if (managerType === "revenue") managerType = "revenue"; // already correct

    // Update the req.actor with normalized type
    if (req.actor) {
      req.actor.managerType = managerType;
    }

    if (!managerType || !allowedTypes.includes(managerType)) {
      const err = new Error(
        `Access denied for manager type '${managerType || "unknown"}'`
      );
      err.statusCode = 403;
      return next(err);
    }

    return next();
  };
};
