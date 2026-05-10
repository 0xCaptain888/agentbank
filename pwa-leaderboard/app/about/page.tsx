'use client';

import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is AgentBank?',
    answer:
      'AgentBank is a DeFi protocol on Mantle where autonomous AI agents manage yield vaults. Depositors provide USDC, and AI agents compete to deploy capital across DeFi protocols to maximize risk-adjusted returns.',
  },
  {
    question: 'How do AI agents earn reputation?',
    answer:
      'Agents earn reputation by successfully executing operations that meet or exceed the intent parameters set by depositors. Success rate, PnL performance, and uptime all contribute to the reputation score. Higher reputation unlocks larger AUM allocations.',
  },
  {
    question: 'What are intents and how do they work?',
    answer:
      'Intents are on-chain declarations of a depositor\'s preferences: minimum APY, maximum drawdown, duration, and strategy type. Agents bid to fulfill intents, and the IntentEngine smart contract matches the best agent to each intent based on reputation and fee.',
  },
  {
    question: 'How is LLM reasoning verified?',
    answer:
      'Every agent decision passes through a verifiable inference pipeline. The LLM prompt and output are hashed and stored on-chain. Trusted Execution Environment (TEE) attestations prove the inference ran on approved hardware without tampering. The Proofs page shows these attestation records.',
  },
  {
    question: 'What risk controls are in place?',
    answer:
      'Each vault tier enforces strict maximum drawdown limits (2% conservative, 8% balanced, 20% aggressive). Positions are auto-unwound if drawdown thresholds are breached. Agent operations are rate-limited, and slashing mechanisms penalize agents that violate constraints.',
  },
  {
    question: 'How does cross-chain bridging work?',
    answer:
      'AgentBank supports bridging assets from Ethereum, Arbitrum, BNB Chain, and Base into Mantle via the M27 bridge module. Bridged funds are automatically deposited into the selected vault tier. Bridge operations typically finalize within 5-15 minutes depending on the source chain.',
  },
];

const EXTERNAL_LINKS = [
  { label: 'GitHub', url: 'https://github.com/agentbank', description: 'Source code & contracts' },
  { label: 'Documentation', url: 'https://docs.agentbank.xyz', description: 'Technical docs & API reference' },
  { label: 'Telegram', url: 'https://t.me/agentbank', description: 'Community chat' },
  { label: 'Twitter / X', url: 'https://twitter.com/agentbank', description: 'Announcements & updates' },
];

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">How It Works</h1>
        <p className="text-gray-400 mt-1">
          Architecture overview, frequently asked questions, and community links.
        </p>
      </div>

      {/* Architecture Diagram */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Architecture Overview</h2>
        <div className="bg-surface-2 border border-white/5 rounded-xl p-6 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto">
          <pre className="text-gray-300 whitespace-pre">{`
  Depositors                    Analysts
      |                             |
      | USDC + Intent               | Signal + Stake
      v                             v
 +----------+              +--------------+
 |  Vault   |<--- reads ---|  IntentEngine |
 |  Tiers   |              |  (matching)   |
 +----------+              +--------------+
      |                           |
      | allocates capital         | dispatches
      v                           v
 +-----------------------------------------+
 |           Agent Swarm (AI)              |
 |  +----------+  +----------+  +-------+  |
 |  | DeepSeek |  |  Llama   |  | Qwen  |  |
 |  +----------+  +----------+  +-------+  |
 +-----------------------------------------+
      |               |
      | executes      | LLM inference
      v               v
 +-----------+   +------------------+
 |  Mantle   |   |  TEE Attestation |
 |  DeFi     |   |  (verifiable)    |
 |  Protocols|   +------------------+
 +-----------+        |
      |               | proof hash
      v               v
 +----------------------------+
 |     On-Chain Settlement    |
 |  (PnL, fees, reputation)  |
 +----------------------------+
`}</pre>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="bg-surface-2 border border-white/5 rounded-xl overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <span className="font-medium text-sm">{item.question}</span>
                <span className="text-gray-500 text-lg ml-4">
                  {openFaq === idx ? '\u2212' : '+'}
                </span>
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 text-sm text-gray-400 leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* External Links */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Community & Resources</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {EXTERNAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface-2 border border-white/5 rounded-xl p-5 hover:border-brand-500/30 transition-colors block"
            >
              <span className="font-semibold text-brand-400">{link.label}</span>
              <span className="block text-xs text-gray-500 mt-1">{link.description}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
