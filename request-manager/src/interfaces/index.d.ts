import 'express';

//this is added so that tenant id can be attached to the request object
declare module 'express-serve-static-core' {
  interface Request {
    tenantId?: string;
  }
}
