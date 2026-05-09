#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const vault_1 = require("./commands/vault");
const signal_1 = require("./commands/signal");
const agent_1 = require("./commands/agent");
const catalog_1 = require("./commands/catalog");
const tier_1 = require("./commands/tier");
const program = new commander_1.Command();
program
    .name('agentbank-cli')
    .description('AgentBank skill — AI agent CLI for autonomous Mantle treasury')
    .version('0.1.0')
    .option('-o, --output <fmt>', 'output format (text|json)', 'text')
    .option('--network <name>', 'mantle | mantle_sepolia', 'mantle');
(0, vault_1.vaultCommands)(program);
(0, signal_1.signalCommands)(program);
(0, agent_1.agentCommands)(program);
(0, catalog_1.catalogCommands)(program);
(0, tier_1.tierCommands)(program);
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
    }
    else {
        console.error(`Error: ${err.message}`);
    }
    process.exit(1);
});
