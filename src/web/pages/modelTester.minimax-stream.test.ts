import { describe, expect, it } from 'vitest';

import { parseAnyStreamDelta } from './ModelTester.js';

describe('ModelTester MiniMax stream parsing', () => {
  it('treats terminal chat.completion payloads as done-only after prior stream chunks already produced content', () => {
    const parsed = parseAnyStreamDelta({
      object: 'chat.completion',
      choices: [{
        index: 0,
        finish_reason: 'stop',
        message: {
          role: 'assistant',
          content: '嗨！👋\n\n你一直打招呼，是不是有什么想问的？\n\n直接说需求就行，我来帮你搞定！🙌',
          reasoning_content: 'The user keeps saying "你好".',
        },
      }],
    }, {
      allowTerminalMessageFallback: false,
    });

    expect(parsed).toEqual({
      done: true,
      contentDelta: undefined,
      reasoningDelta: undefined,
    });
  });

  it('still accepts terminal chat.completion message content when no earlier chunk produced visible output', () => {
    const parsed = parseAnyStreamDelta({
      object: 'chat.completion',
      choices: [{
        index: 0,
        finish_reason: 'stop',
        message: {
          role: 'assistant',
          content: '只返回终态 completion 的兼容流',
        },
      }],
    }, {
      allowTerminalMessageFallback: true,
    });

    expect(parsed).toEqual({
      done: true,
      contentDelta: '只返回终态 completion 的兼容流',
      reasoningDelta: undefined,
    });
  });

  it('keeps incremental chunk content for chat.completion.chunk payloads', () => {
    const parsed = parseAnyStreamDelta({
      object: 'chat.completion.chunk',
      choices: [{
        index: 0,
        finish_reason: 'stop',
        delta: {
          content: '，我来帮你搞定！🙌',
        },
      }],
    });

    expect(parsed).toEqual({
      done: true,
      contentDelta: '，我来帮你搞定！🙌',
      reasoningDelta: undefined,
    });
  });
});
