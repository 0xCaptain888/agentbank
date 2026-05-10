#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const vault_1 = require("./commands/vault");
const signal_1 = require("./commands/signal");
const agent_1 = require("./commands/agent");
const analyst_1 = require("./commands/analyst");
const tier_1 = require("./commands/tier");
const catalog_1 = require("./commands/catalog");
const wallet_1 = require("./commands/wallet");
const risk_1 = require("./commands/risk");
const strategy_1 = require("./commands/strategy");
const program = new commander_1.Command();
program
    .name('agentbank-cli')
    .description('AgentBank skill — AI agent CLI for autonomous Mantle treasury')
    .version('0.2.0')
    .option('-o, --output <fmt>', 'output format (text|json)', 'text')
    .option('--network <name>', 'mantle | mantle_sepolia', 'mantle');
(0, vault_1.vaultCommands)(program);
(0, signal_1.signalCommands)(program);
(0, agent_1.agentCommands)(program);
(0, analyst_1.analystCommands)(program);
(0, tier_1.tierCommands)(program);
(0, catalog_1.catalogCommands)(program);
(0, wallet_1.walletCommands)(program);
(0, risk_1.riskCommands)(program);
(0, strategy_1.strategyCommands)(program);
program.command('skill').description('Display full skill documentation')
    .action(() => {
    const fs = require('fs');
    const path = require('path');
    const skillPath = path.join(__dirname, '../SKILL.md');
    try { console.log(fs.readFileSync(skillPath, 'utf-8')); }
    catch { console.log('AgentBank Skill — use `agentbank-cli catalog list` for capabilities'); }
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
