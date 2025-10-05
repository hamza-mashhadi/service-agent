import { TenantUtils } from '../../utils/tenantUtils';

describe('TenantUtils', () => {
  describe('formatTenantId', () => {
    it('should format tenant ID correctly', () => {
      expect(TenantUtils.formatTenantId('Tenant-1')).toBe('tenant-1');
      expect(TenantUtils.formatTenantId('TENANT_123')).toBe('tenant-123');
      expect(TenantUtils.formatTenantId('tenant@domain.com')).toBe(
        'tenant-domain-com'
      );
      expect(TenantUtils.formatTenantId('tenant with spaces')).toBe(
        'tenant-with-spaces'
      );
    });

    it('should handle empty string', () => {
      expect(TenantUtils.formatTenantId('')).toBe('');
    });

    it('should handle special characters', () => {
      expect(TenantUtils.formatTenantId('tenant!@#$%^&*()')).toBe(
        'tenant----------'
      );
    });
  });

  describe('getExchangeName', () => {
    it('should generate exchange name with tenant suffix', () => {
      const result = TenantUtils.getExchangeName('my-exchange', 'Tenant-1');
      expect(result).toBe('my-exchange-tenant-1');
    });

    it('should handle complex tenant names', () => {
      const result = TenantUtils.getExchangeName(
        'exchange',
        'tenant@domain.com'
      );
      expect(result).toBe('exchange-tenant-domain-com');
    });
  });

  describe('getQueueName', () => {
    it('should generate queue name with tenant suffix', () => {
      const result = TenantUtils.getQueueName('my-queue', 'Tenant-1');
      expect(result).toBe('my-queue-tenant-1');
    });
  });

  describe('getRoutingKey', () => {
    it('should generate routing key with tenant suffix', () => {
      const result = TenantUtils.getRoutingKey('my-routing', 'Tenant-1');
      expect(result).toBe('my-routing-tenant-1');
    });
  });
});
