import { Command } from 'commander';
import { writeOutput } from '../output';

const CATALOG = {
  vault: {
    description: 'Vault operations',
    capabilities: [
      { id: 'vault.stats', params: [], read: true },
      { id: 'vault.deposit', params: ['amount', 'tier', 'confirm'], read: false },
      { id: 'vault.withdraw', params: ['shares', 'confirm'], read: false },
      { id: 'vault.preview-deposit', params: ['amount'], read: true },
    ],
  },
  signals: {
    description: 'Strategy signals on SignalBoard',
    capabilities: [
      { id: 'signals.list', params: ['status', 'limit'], read: true },
      { id: 'signals.post', params: ['type', 'protocol', 'amountPct', 'confidence', 'reasoning'], read: false },
      { id: 'signals.get', params: ['id'], read: true },
    ],
  },
  agents: {
    description: 'Agent identity & reputation (ERC-8004)',
    capabilities: [
      { id: 'agents.list', params: [], read: true },
      { id: 'agents.reputation', params: ['address'], read: true },
      { id: 'agents.validate', params: ['target', 'feedback', 'reason'], read: false },
    ],
  },
  tier: {
    description: 'Multi-tier vault operations',
    capabilities: [
      { id: 'tier.list', params: [], read: true },
      { id: 'tier.deposit', params: ['tier', 'amount'], read: false },
    ],
  },
  risk: {
    description: 'Local risk check on signals',
    capabilities: [
      { id: 'risk.check', params: ['signal-id'], read: true },
    ],
  },
};

export function catalogCommands(program: Command) {
  const cat = program.command('catalog').description('Capability discovery');

  cat.command('list')
    .description('List all capabilities')
    .action((opts, cmd) => {
      const fmt = cmd.parent!.parent!.opts().output;
      writeOutput(fmt, CATALOG);
    });

  cat.command('show')
    .argument('<id>', 'Capability ID')
    .action((id: string, opts, cmd) => {
      const fmt = cmd.parent!.parent!.opts().output;
      for (const ns of Object.values(CATALOG)) {
        const cap = (ns as any).capabilities.find((c: any) => c.id === id);
        if (cap) { writeOutput(fmt, cap); return; }
      }
      throw new Error(`Capability not found: ${id}`);
    });
}
