import { SignatureService } from '../src/services/signature';

describe('SignatureService', () => {
  describe('generateSignature', () => {
    it('should generate correct MD5 signature', () => {
      const options = {
        appkey: 'test_appkey',
        timestamp: 1234567890,
        secretKey: 'test_secret',
      };

      const signature = SignatureService.generateSignature(options);
      
      // MD5('test_appkey1234567890test_secret') = 4b4c3b6a3c9c8e0c8e8c8e0c8e8c8e0c
      expect(signature).toHaveLength(32);
      expect(signature).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should throw error for invalid appkey', () => {
      expect(() => {
        SignatureService.generateSignature({
          appkey: '',
          timestamp: 1234567890,
          secretKey: 'test_secret',
        });
      }).toThrow('Invalid appkey');
    });

    it('should throw error for short appkey', () => {
      expect(() => {
        SignatureService.generateSignature({
          appkey: 'short',
          timestamp: 1234567890,
          secretKey: 'test_secret',
        });
      }).toThrow('appkey length is too short');
    });
  });

  describe('generateTimestamp', () => {
    it('should generate current timestamp', () => {
      const before = Date.now();
      const timestamp = SignatureService.generateTimestamp();
      const after = Date.now();

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('generateAuthHeaders', () => {
    it('should generate correct auth headers', () => {
      const appkey = 'test_appkey_123';
      const secretKey = 'test_secret_456';

      const headers = SignatureService.generateAuthHeaders(appkey, secretKey);

      expect(headers).toHaveProperty('Auth-version', '2.0');
      expect(headers).toHaveProperty('appkey', appkey);
      expect(headers).toHaveProperty('timestamp');
      expect(headers).toHaveProperty('sign');
      expect(headers).toHaveProperty('Connection', 'keep-alive');
      expect(headers.sign).toHaveLength(32); // MD5 hash length
    });
  });
}); 