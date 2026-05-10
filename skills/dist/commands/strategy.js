"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategyCommands = strategyCommands;
const output_1 = require("../output");
function strategyCommands(program) {
    const strategy = program.command('strategies').description('Strategy operations');
    strategy.command('list').description('List active strategies on the vault')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, {
            strategies: [
                { id: 'rwa_usdy', name: 'USDY RWA Strategy', type: 'rwa', target_apy: '5.0%', risk_level: 'low', status: 'active' },
                { id: 'meth_staking', name: 'mETH Liquid Staking', type: 'liquid_staking', target_apy: '4.0%', risk_level: 'low', status: 'active' },
                { id: 'dex_lp_stable', name: 'Stable LP (USDC/USDT)', type: 'lp', target_apy: '8-12%', risk_level: 'medium', status: 'active' },
                { id: 'dex_swap_bluechip', name: 'Blue-chip Swap (ETH/MNT)', type: 'swap', target_apy: '15-30%', risk_level: 'high', status: 'active' },
            ],
            total_active: 4,
            timestamp: Date.now()
        });
    });
    strategy.command('analyze').description('Analyze a specific strategy')
        .requiredOption('--id <id>', 'Strategy ID')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        const strategies = {
            rwa_usdy: { id: 'rwa_usdy', name: 'USDY RWA Strategy', apr_current: 5.0, risk_score: 8, protocol: 'Ondo Finance' },
            meth_staking: { id: 'meth_staking', name: 'mETH Liquid Staking', apr_current: 4.0, risk_score: 12, protocol: 'Mantle LSP' },
            dex_lp_stable: { id: 'dex_lp_stable', name: 'Stable LP', apr_current: 10.2, risk_score: 25, protocol: 'Agni Finance v3' },
            dex_swap_bluechip: { id: 'dex_swap_bluechip', name: 'Blue-chip Swap', apr_current: 22.5, risk_score: 55, protocol: '1inch Aggregator' },
        };
        const result = strategies[opts.id];
        if (!result) throw new Error(`Strategy not found: ${opts.id}`);
        (0, output_1.writeOutput)(fmt, { ...result, timestamp: Date.now() });
    });
}
