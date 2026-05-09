import { Command } from 'commander';
import { writeOutput } from '../output';

export function agentCommands(program: Command) {
  const agents = program.command('agents').description('Agent identity & reputation (ERC-8004)');

  agents
    .command('list')
    .description('List all registered agents')
    .action(async (opts, cmd) => {
      const fmt = cmd.parent!.parent!.opts().output;
      writeOutput(fmt, {
        agents: [
          { type: 'analyst', domain: 'agentbank.xyz/analyst-1', status: 'active' },
          { type: 'executor', domain: 'agentbank.xyz/executor-1', status: 'active' },
          { type: 'guard', domain: 'agentbank.xyz/guard-1', status: 'active' },
          { type: 'allocator', domain: 'agentbank.xyz/allocator-1', status: 'active' },
        ]
      });
    });

  agents
    .command('reputation')
    .requiredOption('--address <addr>', 'Agent wallet address')
    .action(async (opts, cmd) => {
      const fmt = cmd.parent!.parent!.opts().output;
      writeOutput(fmt, { address: opts.address, reputation: 0, total_actions: 0 });
    });

  agents
    .command('validate')
    .requiredOption('--target <addr>', 'Target agent address')
    .requiredOption('--feedback <type>', 'approve or reject')
    .option('--reason <reason>', 'Reason', '')
    .option('--confirm', 'Submit on-chain', false)
    .action(async (opts, cmd) => {
      const fmt = cmd.parent!.parent!.opts().output;
      writeOutput(fmt, {
        dry_run: !opts.confirm,
        target: opts.target,
        feedback: opts.feedback,
        reason: opts.reason,
      });
    });
}
