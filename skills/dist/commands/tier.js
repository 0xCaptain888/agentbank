"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tierCommands = tierCommands;
const output_1 = require("../output");
function tierCommands(program) {
    const tier = program.command('tier').description('Multi-tier vault operations');
    tier
        .command('list')
        .description('List available vault tiers')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, {
            tiers: [
                { name: 'conservative', max_op_bps: 500, max_daily_loss_bps: 100, rwa_only: true },
                { name: 'balanced', max_op_bps: 1000, max_daily_loss_bps: 500, rwa_only: false },
                { name: 'aggressive', max_op_bps: 2500, max_daily_loss_bps: 1500, rwa_only: false },
            ]
        });
    });
    tier
        .command('deposit')
        .requiredOption('--tier <name>', 'Tier name')
        .requiredOption('--amount <usdc>', 'USDC amount')
        .option('--confirm', 'Submit transaction', false)
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, {
            dry_run: !opts.confirm,
            tier: opts.tier,
            amount_usdc: opts.amount,
        });
    });
}
