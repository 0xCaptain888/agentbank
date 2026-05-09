import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

export function skillCommand(program: Command) {
  program
    .command('skill')
    .description('Display full skill documentation')
    .action(() => {
      const skillPath = path.join(__dirname, '../../SKILL.md');
      try {
        const content = fs.readFileSync(skillPath, 'utf-8');
        console.log(content);
      } catch {
        console.log('AgentBank Skill — Autonomous DeFi treasury on Mantle');
        console.log('Use `agentbank-cli catalog list` for all capabilities');
      }
    });
}
