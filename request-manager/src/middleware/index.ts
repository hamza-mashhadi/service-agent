import { Request as ExpressRequest, Response, NextFunction } from 'express';

// Middleware to extract tenant ID
const extractTenantId = (
  req: ExpressRequest,
  res: Response,
  next: NextFunction
) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return res
      .status(400)
      .json({ error: 'Tenant ID is required in x-tenant-id header' });
  }
  req.tenantId = tenantId;
  next();
};

export default extractTenantId;
