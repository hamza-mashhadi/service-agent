export class TenantUtils {
  static formatTenantId(tenantId: string): string {
    return tenantId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  static getExchangeName(baseName: string, tenantId: string): string {
    const formattedTenant = this.formatTenantId(tenantId);
    return `${baseName}-${formattedTenant}`;
  }

  static getQueueName(baseName: string, tenantId: string): string {
    const formattedTenant = this.formatTenantId(tenantId);
    return `${baseName}-${formattedTenant}`;
  }

  static getRoutingKey(baseName: string, tenantId: string): string {
    const formattedTenant = this.formatTenantId(tenantId);
    return `${baseName}-${formattedTenant}`;
  }
}
