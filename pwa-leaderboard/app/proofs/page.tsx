'use client';

import { useState } from 'react';

type AttestationStatus = 'verified' | 'unverified';

interface ProofRecord {
  id: string;
  promptHash: string;
  outputHash: string;
  model: string;
  agent: string;
  attestation: AttestationStatus;
  timestamp: string;
  txHash: string;
  reasoningSummary: string;
}

const MOCK_PROOFS: ProofRecord[] = [
  { id: '1', promptHash: '0x8a3f...b2c1', outputHash: '0xd4e5...f6a7', model: 'DeepSeek R1-0528', agent: 'AlphaYield-7B', attestation: 'verified', timestamp: '3 min ago', txHash: '0x1abc...2def', reasoningSummary: 'Rebalance LP on Agni: MNT/USDC range tightened due to volatility compression.' },
  { id: '2', promptHash: '0x1b2c...3d4e', outputHash: '0x5f6a...7b8c', model: 'Llama 4-Maverick', agent: 'DeltaHedger-v3', attestation: 'verified', timestamp: '8 min ago', txHash: '0x3ghi...4jkl', reasoningSummary: 'Open hedge position: ETH short via perps to offset LP delta exposure.' },
  { id: '3', promptHash: '0x9d0e...1f2a', outputHash: '0x3b4c...5d6e', model: 'Qwen 3-235B', agent: 'StableMaxi-LLM', attestation: 'verified', timestamp: '15 min ago', txHash: '0x5mno...6pqr', reasoningSummary: 'Increase Lendle deposit: utilization rate favorable, borrow demand rising.' },
  { id: '4', promptHash: '0x7f8a...9b0c', outputHash: '0x1d2e...3f4a', model: 'DeepSeek R1-0528', agent: 'MomentumBot-Q', attestation: 'unverified', timestamp: '22 min ago', txHash: '0x7stu...8vwx', reasoningSummary: 'Directional long MNT: momentum indicators bullish across 4h and 1d timeframes.' },
  { id: '5', promptHash: '0x5b6c...7d8e', outputHash: '0x9f0a...1b2c', model: 'Allora v2.1', agent: 'ArbitrageNet-v2', attestation: 'verified', timestamp: '35 min ago', txHash: '0x9yza...0bcd', reasoningSummary: 'Cross-pool arbitrage: MNT price discrepancy between Agni and Merchant Moe.' },
  { id: '6', promptHash: '0x3d4e...5f6a', outputHash: '0x7b8c...9d0e', model: 'Llama 4-Maverick', agent: 'YieldFarm-GPT', attestation: 'verified', timestamp: '48 min ago', txHash: '0x1efg...2hij', reasoningSummary: 'Harvest and compound: accumulated rewards exceed gas cost threshold.' },
  { id: '7', promptHash: '0x1f2a...3b4c', outputHash: '0x5d6e...7f8a', model: 'Qwen 3-235B', agent: 'AlphaYield-7B', attestation: 'unverified', timestamp: '1 hr ago', txHash: '0x3klm...4nop', reasoningSummary: 'Exit position: drawdown approaching 7.2% on balanced tier, risk limit near.' },
  { id: '8', promptHash: '0x9b0c...1d2e', outputHash: '0x3f4a...5b6c', model: 'DeepSeek R1-0528', agent: 'RiskParity', attestation: 'verified', timestamp: '1.5 hr ago', txHash: '0x5qrs...6tuv', reasoningSummary: 'Rotate from Lendle to Agni: better yield opportunity after rate change.' },
];

function attestationBadge(status: AttestationStatus) {
  if (status === 'verified') {
    return <span className="badge badge-green">Verified</span>;
  }
  return <span className="badge bg-yellow-500/10 text-yellow-400">Unverified</span>;
}

export default function ProofsPage() {
  const [filterAttestation, setFilterAttestation] = useState<'all' | AttestationStatus>('all');

  const filtered =
    filterAttestation === 'all'
      ? MOCK_PROOFS
      : MOCK_PROOFS.filter((p) => p.attestation === filterAttestation);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reasoning Proofs</h1>
        <p className="text-gray-400 mt-1">
          Verifiable LLM reasoning records with TEE attestations. Every agent decision is hashed and recorded on-chain.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <span className="stat-label">Total Proofs</span>
          <span className="stat-value">{MOCK_PROOFS.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Verified</span>
          <span className="stat-value text-emerald-400">
            {MOCK_PROOFS.filter((p) => p.attestation === 'verified').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Verification</span>
          <span className="stat-value text-yellow-400">
            {MOCK_PROOFS.filter((p) => p.attestation === 'unverified').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Models Used</span>
          <span className="stat-value">{new Set(MOCK_PROOFS.map((p) => p.model)).size}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'verified', 'unverified'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterAttestation(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterAttestation === f
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'bg-surface-2 text-gray-400 border border-white/5 hover:border-white/10'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Proof Records */}
      <div className="space-y-3">
        {filtered.map((proof) => (
          <div
            key={proof.id}
            className="bg-surface-2 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{proof.agent}</span>
                <span className="text-gray-600">&middot;</span>
                <span className="text-sm text-gray-400">{proof.model}</span>
                {attestationBadge(proof.attestation)}
              </div>
              <span className="text-xs text-gray-500">{proof.timestamp}</span>
            </div>

            {/* Reasoning Summary */}
            <p className="text-sm text-gray-300 leading-relaxed">{proof.reasoningSummary}</p>

            {/* Hashes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Prompt Hash</span>
                <span className="font-mono text-gray-400">{proof.promptHash}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Output Hash</span>
                <span className="font-mono text-gray-400">{proof.outputHash}</span>
              </div>
              <div>
                <span className="text-gray-500 block">On-Chain Tx</span>
                <a
                  href={`https://explorer.mantle.xyz/tx/${proof.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-brand-400 hover:text-brand-300"
                >
                  {proof.txHash} &rarr;
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
