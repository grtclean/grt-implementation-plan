import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test Gemini API key validation
describe('Gemini API Key Validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should have GEMINI_API_KEY environment variable set', () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    expect(typeof apiKey).toBe('string');
  });

  it('should have valid API key format', () => {
    const apiKey = process.env.GEMINI_API_KEY;
    // Gemini API keys typically start with 'AI' and are 39 characters long
    expect(apiKey).toBeDefined();
    if (apiKey) {
      expect(apiKey.length).toBeGreaterThan(20);
      // API key should only contain alphanumeric characters and underscores/hyphens
      expect(/^[A-Za-z0-9_-]+$/.test(apiKey)).toBe(true);
    }
  });

  it('should be able to make a test request to Gemini API', async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.log('Skipping API test - no API key configured');
      return;
    }

    // Test with a simple models list request (lightweight endpoint)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Check if the API key is valid
    if (response.status === 400 || response.status === 403) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      throw new Error(`Invalid Gemini API key: ${errorData.error?.message || 'Unknown error'}`);
    }

    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.models).toBeDefined();
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.models.length).toBeGreaterThan(0);
    
    // Log available models for reference
    console.log('✅ Gemini API key is valid!');
    console.log('Available models:', data.models.slice(0, 5).map((m: any) => m.name));
  });
});
