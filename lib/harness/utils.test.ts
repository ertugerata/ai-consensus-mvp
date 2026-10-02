import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeXmlData, sanitizeIdentifier, sanitizeErrorMessage } from './utils.ts';
import { getPrimaryAgents, ConfigStateSchema } from '../types.ts';

test('sanitizeXmlData escapes angle brackets and strips zero-width chars', () => {
  assert.equal(sanitizeXmlData('<user_prompt>Hello</user_prompt>'), '&lt;user_prompt&gt;Hello&lt;/user_prompt&gt;');
  assert.equal(sanitizeXmlData('< /user_prompt>'), '&lt; /user_prompt&gt;');
  assert.equal(sanitizeXmlData('</user_prompt\u200b>'), '&lt;/user_prompt&gt;');
  assert.equal(sanitizeXmlData('＜/user_prompt＞'), '&lt;/user_prompt&gt;');
});

test('sanitizeIdentifier strips newlines and angle brackets', () => {
  assert.equal(sanitizeIdentifier('Ajan <Test>\nName'), 'Ajan TestName');
  assert.equal(sanitizeIdentifier('   model_1   '), 'model_1');
});

test('sanitizeErrorMessage masks sensitive keys and internal hosts', () => {
  assert.equal(
    sanitizeErrorMessage('Error with sk-proj-1234567890abcdef key'),
    'Error with [MASKED_KEY] key'
  );
  assert.equal(
    sanitizeErrorMessage('Anthropic key sk-ant-api03-12345 error'),
    'Anthropic key [MASKED_KEY] error'
  );
  assert.equal(
    sanitizeErrorMessage('Gemini AIzaSyABC123456 error'),
    'Gemini [MASKED_KEY] error'
  );
  assert.equal(
    sanitizeErrorMessage('Connection refused host.docker.internal:11434'),
    'Connection refused [INTERNAL_HOST]'
  );
});

test('getPrimaryAgents extracts valid primary agents or throws via Zod schema', () => {
  const validConfig = {
    agents: [
      { id: 'ag1', provider: 'openai' as const, model: 'gpt-4o-mini' },
      { id: 'ag2', provider: 'anthropic' as const, model: 'claude-3-5-haiku-20241022' },
    ],
    referee: { id: 'ref', provider: 'openrouter' as const, model: 'anthropic/claude-3.5-sonnet' },
  };

  const parsed = ConfigStateSchema.safeParse(validConfig);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    const primary = getPrimaryAgents(parsed.data);
    assert.equal(primary.length, 2);
    assert.equal(primary[0].id, 'ag1');
  }
});

test('ConfigStateSchema rejects duplicate agent IDs or referee ID collisions', () => {
  const duplicateConfig = {
    agents: [
      { id: 'dup_id', provider: 'openai' as const, model: 'gpt-4o-mini' },
      { id: 'dup_id', provider: 'anthropic' as const, model: 'claude-3-5-haiku-20241022' },
    ],
    referee: { id: 'referee', provider: 'openrouter' as const, model: 'anthropic/claude-3.5-sonnet' },
  };

  const parsed = ConfigStateSchema.safeParse(duplicateConfig);
  assert.equal(parsed.success, false);

  const refereeCollisionConfig = {
    agents: [
      { id: 'referee', provider: 'openai' as const, model: 'gpt-4o-mini' },
      { id: 'ag2', provider: 'anthropic' as const, model: 'claude-3-5-haiku-20241022' },
    ],
    referee: { id: 'referee', provider: 'openrouter' as const, model: 'anthropic/claude-3.5-sonnet' },
  };

  const parsedRef = ConfigStateSchema.safeParse(refereeCollisionConfig);
  assert.equal(parsedRef.success, false);
});
