"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vaultCommands = vaultCommands;
const output_1 = require("../output");
function vaultCommands(program) {
    const vault = program.command('vault').description('Vault operations');
    vault
        .command('stats')
        .description('Show vault TVL, APY, and operation counters')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, {
            tvl: '0',
            ops_executed: '0',
            ops_blocked: '0',
            yield_earned: '0',
            is_paused: false,
            share_price: '1000000',
            network: cmd.parent.parent.opts().network,
            timestamp: Date.now(),
        });
    });
    vault
        .command('deposit')
        .requiredOption('--amount <usdc>', 'Amount of USDC to deposit')
        .option('--tier <name>', 'Tier (conservative|balanced|aggressive)', 'balanced')
        .option('--confirm', 'Submit transaction', false)
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        const amount = BigInt(Math.floor(parseFloat(opts.amount) * 1e6));
        (0, output_1.writeOutput)(fmt, {
            dry_run: !opts.confirm,
            amount_in_usdc: amount.toString(),
            shares_out: amount.toString(),
            tier: opts.tier,
        });
    });
    vault
        .command('withdraw')
        .requiredOption('--shares <shares>', 'Amount of ABV shares to burn')
        .option('--confirm', 'Submit transaction', false)
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, {
            dry_run: !opts.confirm,
            shares_in: opts.shares,
            assets_out: opts.shares,
        });
    });
    vault
        .command('preview-deposit')
        .requiredOption('--amount <usdc>', 'Amount of USDC')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        const amount = BigInt(Math.floor(parseFloat(opts.amount) * 1e6));
        (0, output_1.writeOutput)(fmt, { amount_usdc: amount.toString(), shares_out: amount.toString() });
    });
}
