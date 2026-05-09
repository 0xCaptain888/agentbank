"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analystCommands = analystCommands;
const output_1 = require("../output");
function analystCommands(program) {
    const analyst = program.command('analyst').description('Analyst marketplace operations');
    analyst.command('register')
        .requiredOption('--stake <mnt>', 'MNT amount to stake')
        .option('--domain <domain>', 'Agent domain', 'custom-analyst.agentbank.xyz')
        .option('--confirm', 'Submit transaction', false)
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        const stake = parseFloat(opts.stake);
        if (!opts.confirm) {
            return (0, output_1.writeOutput)(fmt, { dry_run: true, stake_mnt: stake, domain: opts.domain, min_stake: 100, unstake_delay_days: 7 });
        }
        (0, output_1.writeOutput)(fmt, { status: 'registered', stake_mnt: stake, domain: opts.domain });
    });
    analyst.command('earnings').description('View accrued analyst fees')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, { unclaimed_usdc: '0', total_earned_usdc: '0', signals_chosen: 0, signals_executed: 0, timestamp: Date.now() });
    });
    analyst.command('withdraw-stake')
        .option('--confirm', 'Submit transaction', false)
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        if (!opts.confirm) {
            return (0, output_1.writeOutput)(fmt, { dry_run: true, message: 'Will request unstake. 7-day delay applies.' });
        }
        (0, output_1.writeOutput)(fmt, { status: 'unstake_requested', delay_days: 7 });
    });
    analyst.command('list').description('List all active analysts')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, { analysts: [
            { domain: 'agentbank.xyz/analyst-deepseek', stake: '100', reputation: '85', signals: 42 },
            { domain: 'agentbank.xyz/analyst-llama', stake: '100', reputation: '72', signals: 38 },
            { domain: 'agentbank.xyz/analyst-qwen', stake: '150', reputation: '68', signals: 35 },
        ], total_active: 3 });
    });
}
