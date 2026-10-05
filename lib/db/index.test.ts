import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAllSessions, getSessionById, saveSession, deleteSessionById } from './index.ts';
import type { ConfigState, MultiStageResults } from '../types.ts';

const testConfig: ConfigState = {
  agents: [
    {
      id: 'agent_1',
      name: 'Agent A',
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
    },
    {
      id: 'agent_2',
      name: 'Agent B',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
    },
  ],
  referee: {
    id: 'referee',
    name: 'Referee',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
  },
};

const testResults: MultiStageResults = {
  stage1Divergence: {
    agent_1: {
      agentId: 'agent_1',
      agentName: 'Agent A',
      provider: 'openai',
      model: 'gpt-4o-mini',
      text: 'Response 1',
      status: 'fulfilled',
      latencyMs: 100,
    },
  },
  stage3Synthesis: {
    agentId: 'referee',
    agentName: 'Referee',
    provider: 'openai',
    model: 'gpt-4o',
    text: 'Consensus output',
    status: 'fulfilled',
    latencyMs: 200,
  },
  totalLatencyMs: 300,
};

describe('Database Operations (lib/db)', () => {
  it('saves and retrieves a session correctly', () => {
    const sessionId = `test-session-${Date.now()}`;
    const saved = saveSession({
      id: sessionId,
      title: 'Test Session Title',
      prompt: 'What is consensus?',
      memory: 'Test memory',
      evaluationCriteria: 'Test criteria',
      config: testConfig,
      enableCrossReview: true,
      results: testResults,
      allowOverwrite: true,
    });

    assert.equal(saved.id, sessionId);
    assert.equal(saved.title, 'Test Session Title');
    assert.equal(saved.prompt, 'What is consensus?');

    const fetched = getSessionById(sessionId);
    assert.notEqual(fetched, null);
    assert.equal(fetched?.id, sessionId);
    assert.equal(fetched?.title, 'Test Session Title');
    assert.equal(fetched?.prompt, 'What is consensus?');

    const allSessions = getAllSessions();
    assert.ok(allSessions.some((s) => s.id === sessionId));

    const deleted = deleteSessionById(sessionId);
    assert.equal(deleted, true);

    const afterDelete = getSessionById(sessionId);
    assert.equal(afterDelete, null);
  });
});
