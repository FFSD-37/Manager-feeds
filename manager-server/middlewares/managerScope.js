export const requireManagerTypes = (allowedTypes = []) => {
  return (req, res, next) => {
    const managerType = req.actor?.managerType;

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
