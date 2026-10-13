import fs from 'fs';
import path from 'path';
import type { AgentSkill } from './types.ts';
import { AGENT_SKILLS as PRESET_SKILLS } from './config/agents.ts';

export function getSkillsDirectory(): string {
  if (process.env.AGENT_SKILLS_DIR) {
    return process.env.AGENT_SKILLS_DIR;
  }
  return path.join(process.cwd(), 'skills', 'agents');
}

/**
 * Parses markdown skill content with optional YAML-like frontmatter
 * Example frontmatter:
 * ---
 * name: Kıdemli Yazılım Mimarı
 * description: Temiz kod ve mimari tasarım uzmanı
 * ---
 * # Talimatlar
 * Sen kıdemli bir yazılım mimarısın...
 */
export function parseSkillMarkdown(content: string, filename: string, stats?: fs.Stats): AgentSkill {
  const id = filename.replace(/\.md$/i, '').trim();
  let name = '';
  let description = '';
  let prompt = content;

  // Check for YAML-like frontmatter between --- and ---
  const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);

  if (frontmatterMatch) {
    const rawFrontmatter = frontmatterMatch[1];
    prompt = frontmatterMatch[2].trim();

    const nameMatch = rawFrontmatter.match(/^name:\s*(.+)$/m);
    if (nameMatch) {
      name = nameMatch[1].trim().replace(/^['"](.*)['"]$/, '$1');
    }

    const descMatch = rawFrontmatter.match(/^description:\s*(.+)$/m);
    if (descMatch) {
      description = descMatch[1].trim().replace(/^['"](.*)['"]$/, '$1');
    }
  }

  // If no name found in frontmatter, look for first markdown heading (# Title)
  if (!name) {
    const headingMatch = prompt.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      name = headingMatch[1].trim();
    } else {
      // Generate readable name from filename (e.g. "software_architect" -> "Software Architect")
      name = id
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }

  // If no description found in frontmatter, look for first non-heading paragraph or blockquote
  if (!description) {
    const lines = prompt
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('---'));

    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^>\s*/, '');
      description = firstLine.length > 150 ? firstLine.slice(0, 147) + '...' : firstLine;
    } else {
      description = `${name} rolü ve talimatları`;
    }
  }

  return {
    id,
    name,
    description,
    prompt,
    filename,
    filePath: path.join('skills', 'agents', filename),
    isCustom: true,
    updatedAt: stats ? stats.mtime.toISOString() : new Date().toISOString(),
  };
}

/**
 * Initializes and seeds the skills/agents directory if empty
 */
export function ensureSkillsDirectory(): string {
  const dir = getSkillsDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Check if directory is empty; if so, seed standard skills as .md files
  const existingFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  if (existingFiles.length === 0) {
    seedDefaultSkills(dir);
  }

  return dir;
}

function seedDefaultSkills(dir: string): void {
  for (const preset of PRESET_SKILLS) {
    const filename = `${preset.id}.md`;
    const filePath = path.join(dir, filename);
    const content = `---
name: ${preset.name}
description: ${preset.description}
---

# ${preset.name}

${preset.description}

## Sistem Talimatı (Prompt)
${preset.prompt}
`;
    try {
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (err) {
      console.warn(`Varsayılan skill dosyası yazılamadı (${filename}):`, err);
    }
  }
}

/**
 * Retrieves all markdown skills from the designated skills directory
 */
export function getAllSkills(): AgentSkill[] {
  const dir = ensureSkillsDirectory();

  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    const skills: AgentSkill[] = [];

    for (const file of files) {
      try {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        skills.push(parseSkillMarkdown(content, file, stats));
      } catch (err) {
        console.warn(`Skill dosyası okunamadı (${file}):`, err);
      }
    }

    // Sort by name
    skills.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    return skills;
  } catch (err) {
    console.error('Skill dizini listelenemedi:', err);
    return PRESET_SKILLS.map((s) => ({
      ...s,
      filename: `${s.id}.md`,
      filePath: path.join('skills', 'agents', `${s.id}.md`),
      isCustom: false,
    }));
  }
}

/**
 * Finds a skill by ID or filename
 */
export function getSkillById(idOrFilename: string): AgentSkill | null {
  const cleanId = sanitizeSkillFilename(idOrFilename).replace(/\.md$/i, '');
  const dir = ensureSkillsDirectory();
  const filePath = path.join(dir, `${cleanId}.md`);

  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      return parseSkillMarkdown(content, `${cleanId}.md`, stats);
    } catch (err) {
      console.warn(`Skill okunamadı (${cleanId}):`, err);
    }
  }

  // Fallback to built-in presets
  const preset = PRESET_SKILLS.find((p) => p.id === cleanId);
  if (preset) {
    return {
      ...preset,
      filename: `${preset.id}.md`,
      filePath: path.join('skills', 'agents', `${preset.id}.md`),
      isCustom: false,
    };
  }

  return null;
}

/**
 * Sanitizes a filename to prevent path traversal and ensure safe markdown naming
 */
export function sanitizeSkillFilename(rawName: string): string {
  // Strip paths, directories, and invalid characters
  const base = path.basename(rawName).trim();
  const withoutExt = base.replace(/\.md$/i, '');
  const sanitized = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return (sanitized || 'custom-skill') + '.md';
}

/**
 * Saves or updates a markdown skill file
 */
export function saveSkill(
  filename: string,
  content: string,
  metadata?: { name?: string; description?: string }
): AgentSkill {
  const dir = ensureSkillsDirectory();
  const safeFilename = sanitizeSkillFilename(filename);
  const filePath = path.join(dir, safeFilename);

  let finalContent = content.trim();

  // If metadata is provided and content doesn't already have frontmatter, prepend frontmatter
  if (metadata && (metadata.name || metadata.description) && !finalContent.startsWith('---')) {
    const fmName = metadata.name ? `name: ${metadata.name}\n` : '';
    const fmDesc = metadata.description ? `description: ${metadata.description}\n` : '';
    finalContent = `---\n${fmName}${fmDesc}---\n\n${finalContent}`;
  }

  fs.writeFileSync(filePath, finalContent, 'utf8');
  const stats = fs.statSync(filePath);
  return parseSkillMarkdown(finalContent, safeFilename, stats);
}

/**
 * Deletes a markdown skill file
 */
export function deleteSkill(idOrFilename: string): boolean {
  const cleanId = sanitizeSkillFilename(idOrFilename).replace(/\.md$/i, '');
  const dir = ensureSkillsDirectory();
  const filePath = path.join(dir, `${cleanId}.md`);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (err) {
      console.error(`Skill silinemedi (${cleanId}):`, err);
      return false;
    }
  }
  return false;
}
