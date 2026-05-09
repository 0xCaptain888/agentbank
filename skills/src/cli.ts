#!/usr/bin/env node
import { Command } from 'commander';
import { vaultCommands } from './commands/vault';
import { signalCommands } from './commands/signal';
import { agentCommands } from './commands/agent';
import { analystCommands } from './commands/analyst';
import { tierCommands } from './commands/tier';
import { catalogCommands } from './commands/catalog';
import { skillCommand } from './commands/skill';
import { walletCommands } from './commands/wallet';
import { riskCommands } from './commands/risk';

const program = new Command();

program
  .name('agentbank-cli')
  .description('AgentBank skill — AI agent CLI for autonomous Mantle treasury')
  .version('0.2.0')
  .option('-o, --output <fmt>', 'output format (text|json)', 'text')
  .option('--network <name>', 'mantle | mantle_sepolia', 'mantle');

vaultCommands(program);
signalCommands(program);
agentCommands(program);
analystCommands(program);
tierCommands(program);
catalogCommands(program);
skillCommand(program);
walletCommands(program);
riskCommands(program);

program.parseAsync(process.argv).catch(err => {
  if (program.opts().output === 'json') {
    console.log(JSON.stringify({ ok: false, error: err.message }));
  } else {
    console.error(`Error: ${err.message}`);
  }
  process.exit(1);
});
