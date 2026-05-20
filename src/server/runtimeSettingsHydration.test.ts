import { afterEach, describe, expect, it } from 'vitest';

import { config } from './config.js';
import { applyRuntimeSettings } from './runtimeSettingsHydration.js';

const originalConfig = structuredClone(config);

afterEach(() => {
  Object.assign(config, structuredClone(originalConfig));
});

describe('applyRuntimeSettings', () => {
  it('hydrates persisted runtime settings that should survive restarts', () => {
    config.disableCrossProtocolFallback = false;
    config.responsesCompactFallbackToResponsesEnabled = false;
    config.webhookEnabled = true;
    config.barkEnabled = true;
    config.serverChanEnabled = true;
    config.globalAllowedModels = [];

    applyRuntimeSettings(new Map([
      ['disable_cross_protocol_fallback', JSON.stringify(true)],
      ['responses_compact_fallback_to_responses_enabled', JSON.stringify(true)],
      ['webhook_enabled', JSON.stringify(false)],
      ['bark_enabled', JSON.stringify(false)],
      ['serverchan_enabled', JSON.stringify(false)],
      ['global_allowed_models', JSON.stringify(['gpt-5.4', ' claude-3.7-sonnet '])],
    ]));

    expect(config.disableCrossProtocolFallback).toBe(true);
    expect(config.responsesCompactFallbackToResponsesEnabled).toBe(true);
    expect(config.webhookEnabled).toBe(false);
    expect(config.barkEnabled).toBe(false);
    expect(config.serverChanEnabled).toBe(false);
    expect(config.globalAllowedModels).toEqual(['gpt-5.4', 'claude-3.7-sonnet']);
  });

  it('recovers stringified string-list settings that were double JSON encoded', () => {
    config.globalAllowedModels = ['stale-model'];
    config.adminIpAllowlist = ['127.0.0.1'];
    config.proxyErrorKeywords = ['timeout'];

    applyRuntimeSettings(new Map([
      ['global_allowed_models', JSON.stringify(JSON.stringify(['gpt-4o', ' claude-3.7-sonnet ']))],
      ['admin_ip_allowlist', JSON.stringify(JSON.stringify(['10.0.0.1', ' 10.0.0.2 ']))],
      ['proxy_error_keywords', JSON.stringify(JSON.stringify(['quota', ' timeout ']))],
    ]));

    expect(config.globalAllowedModels).toEqual(['gpt-4o', 'claude-3.7-sonnet']);
    expect(config.adminIpAllowlist).toEqual(['10.0.0.1', '10.0.0.2']);
    expect(config.proxyErrorKeywords).toEqual(['quota', 'timeout']);
  });

  it('normalizes smtpPort to a positive integer during hydration', () => {
    config.smtpPort = 587;

    applyRuntimeSettings(new Map([
      ['smtp_port', JSON.stringify(587.9)],
    ]));

    expect(config.smtpPort).toBe(587);
  });
});
