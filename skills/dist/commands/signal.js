"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalCommands = signalCommands;
const output_1 = require("../output");
function signalCommands(program) {
    const signals = program.command('signals').description('Strategy signals on SignalBoard');
    signals
        .command('list')
        .option('--status <status>', 'Filter by status (Pending|Executed|Blocked)', 'Pending')
        .option('--limit <n>', 'Max results', '10')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, { signals: [], status_filter: opts.status, limit: parseInt(opts.limit) });
    });
    signals
        .command('post')
        .requiredOption('--type <type>', 'Signal type (swap|addLiquidity|removeLiquidity|rebalance)')
        .requiredOption('--protocol <protocol>', 'Target protocol')
        .requiredOption('--amount-pct <pct>', 'Percentage of vault TVL')
        .requiredOption('--confidence <n>', 'Confidence 0-100')
        .requiredOption('--reasoning <text>', 'Reasoning text')
        .option('--confirm', 'Submit on-chain', false)
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, {
            dry_run: !opts.confirm,
            signal_type: opts.type,
            target_protocol: opts.protocol,
            amount_pct: parseInt(opts.amountPct),
            confidence: parseInt(opts.confidence),
            reasoning: opts.reasoning,
        });
    });
    signals
        .command('get')
        .requiredOption('--id <id>', 'Signal ID')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, { id: opts.id, status: 'unknown' });
    });
}
