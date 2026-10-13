import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  parseSkillMarkdown,
  sanitizeSkillFilename,
  getAllSkills,
  getSkillById,
  saveSkill,
  deleteSkill,
  ensureSkillsDirectory,
} from './skills.ts';

describe('Agent Skills Markdown Loader & Parser (lib/skills)', () => {
  test('parseSkillMarkdown extracts YAML-like frontmatter correctly', () => {
    const md = `---
name: Siber Güvenlik Uzmanı
description: OWASP ve zafiyet analizi yapar
---

# Rol
Sen kıdemli bir güvenlik denetçisisin.
`;
    const skill = parseSkillMarkdown(md, 'cyber-security.md');
    assert.strictEqual(skill.id, 'cyber-security');
    assert.strictEqual(skill.name, 'Siber Güvenlik Uzmanı');
    assert.strictEqual(skill.description, 'OWASP ve zafiyet analizi yapar');
    assert.ok(skill.prompt.includes('Sen kıdemli bir güvenlik denetçisisin'));
  });

  test('parseSkillMarkdown falls back to # Heading and first paragraph without frontmatter', () => {
    const md = `# Veri Bilimci

Büyük veri setlerini inceler ve makine öğrenmesi modelleri kurar.

## Detaylı Talimat
Python ve scikit-learn kullanarak çalış.
`;
    const skill = parseSkillMarkdown(md, 'data-science.md');
    assert.strictEqual(skill.id, 'data-science');
    assert.strictEqual(skill.name, 'Veri Bilimci');
    assert.ok(skill.description.includes('Büyük veri setlerini inceler'));
    assert.ok(skill.prompt.includes('Python ve scikit-learn'));
  });

  test('sanitizeSkillFilename prevents path traversal and enforces safe characters', () => {
    assert.strictEqual(sanitizeSkillFilename('../../etc/passwd'), 'passwd.md');
    assert.strictEqual(sanitizeSkillFilename('Özel Beceri (Test)!'), 'zel-beceri-test.md');
    assert.strictEqual(sanitizeSkillFilename('custom-agent.md'), 'custom-agent.md');
  });

  test('ensureSkillsDirectory and getAllSkills seed and retrieve default .md skills', () => {
    const dir = ensureSkillsDirectory();
    assert.ok(fs.existsSync(dir));

    const skills = getAllSkills();
    assert.ok(skills.length >= 7, 'En az 7 varsayılan skill listelenmeli');

    const analytical = getSkillById('analytical');
    assert.ok(analytical !== null);
    assert.ok(analytical.prompt.length > 0);
  });

  test('saveSkill, getSkillById, and deleteSkill lifecycle works as expected', () => {
    const testFilename = 'unit-test-skill.md';
    const testContent = `---
name: Test Becerisi
description: Birim test amaçlı geçici beceri
---
Sen bir test asistanısın.`;

    const saved = saveSkill(testFilename, testContent);
    assert.strictEqual(saved.id, 'unit-test-skill');
    assert.strictEqual(saved.name, 'Test Becerisi');

    const fetched = getSkillById('unit-test-skill');
    assert.ok(fetched !== null);
    assert.strictEqual(fetched.name, 'Test Becerisi');

    const deleted = deleteSkill('unit-test-skill');
    assert.strictEqual(deleted, true);

    const afterDelete = getSkillById('unit-test-skill');
    assert.strictEqual(afterDelete, null);
  });
});
