import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.SCHEDULER_PORT || '5000', 10),
  tenants: process.env.TENANTS?.split(',').map(t => t.trim()) || ['default'],
};
