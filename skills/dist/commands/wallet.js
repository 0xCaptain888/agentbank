"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletCommands = walletCommands;
const output_1 = require("../output");
const fs = require("fs");
const path = require("path");
const os = require("os");
const CONFIG_DIR = path.join(os.homedir(), '.config', 'agentbank', 'keys');
function walletCommands(program) {
    const wallet = program.command('wallet').description('Wallet configuration');
    wallet.command('set').description('Configure wallet for write operations')
        .requiredOption('--network <network>', 'Network (mantle | mantle_sepolia)')
        .requiredOption('--private-key <key>', 'Private key (0x...)')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
        const configFile = path.join(CONFIG_DIR, `${opts.network}.json`);
        fs.writeFileSync(configFile, JSON.stringify({ network: opts.network, configured: true, configuredAt: Date.now() }), { mode: 0o600 });
        (0, output_1.writeOutput)(fmt, { status: 'configured', network: opts.network, config_path: CONFIG_DIR });
    });
    wallet.command('privy').description('Configure wallet via Privy session token')
        .requiredOption('--token <token>', 'Privy session token')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        (0, output_1.writeOutput)(fmt, { status: 'configured', method: 'privy' });
    });
    wallet.command('status').description('Show wallet configuration status')
        .action(async (opts, cmd) => {
        const fmt = cmd.parent.parent.opts().output;
        const network = cmd.parent.parent.opts().network;
        const configFile = path.join(CONFIG_DIR, `${network}.json`);
        let configured = false;
        try { fs.accessSync(configFile); configured = true; } catch {}
        (0, output_1.writeOutput)(fmt, { network, configured, config_path: CONFIG_DIR });
    });
}
