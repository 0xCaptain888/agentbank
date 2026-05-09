#!/usr/bin/env node
import { Command } from 'commander';
import { vaultCommands } from './commands/vault';
import { signalCommands } from './commands/signal';
import { agentCommands } from './commands/agent';
import { catalogCommands } from './commands/catalog';
import { tierCommands } from './commands/tier';

const program = new Command();

program
  .name('agentbank-cli')
  .description('AgentBank skill — AI agent CLI for autonomous Mantle treasury')
  .version('0.1.0')
  .option('-o, --output <fmt>', 'output format (text|json)', 'text')
  .option('--network <name>', 'mantle | mantle_sepolia', 'mantle');

vaultCommands(program);
signalCommands(program);
agentCommands(program);
catalogCommands(program);
tierCommands(program);

program.command('skill')
  .description('Show skill documentation')
  .action(() => {
    console.log('AgentBank Skill v0.1.0');
    console.log('An autonomous DeFi treasury on Mantle managed by four AI agents.');
    console.log('');
    console.log('Use `agentbank-cli catalog list` for all capabilities.');
    console.log('Use `agentbank-cli --help` for command details.');
  });

program.parseAsync(process.argv).catch(err => {
  if (program.opts().output === 'json') {
    console.log(JSON.stringify({ ok: false, error: err.message }));
  } else {
    console.error(`Error: ${err.message}`);
  }
  process.exit(1);
});
