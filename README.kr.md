# AgentBank V3

> **Mantle Turing Test Hackathon 2026 · Agentic Wallets & Economy · 1등 상금 $8,500 목표**

Mantle 위에 구축된 멀티 에이전트 자율 트레저리 시스템으로, 검증 가능한 AI 추론, Intent 기반 아키텍처, 크로스체인 실행, 거버넌스 토큰 경제를 포함합니다.

[![Deployed on Mantle](https://img.shields.io/badge/Deployed-Mantle%20Mainnet-00D395)](https://explorer.mantle.xyz)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-Three%20Registries-purple)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 프로젝트 소개

AgentBank는 여러 AI 에이전트가 협력하여 자율적으로 DeFi 자산을 관리하는 프로토콜입니다. 각 에이전트는 온체인에 등록된 아이덴티티를 보유하며, 모든 LLM 추론 과정이 해시 체인으로 검증 가능하게 기록됩니다. V3에서는 TEE(신뢰 실행 환경) 증명, Intent 라우팅, veToken 거버넌스, Commit-Reveal 시그널링을 추가하여 프로토콜의 보안성과 탈중앙화를 대폭 강화했습니다.

---

## 핵심 기능

### 1. 검증 가능한 AI (Verifiable AI)

- TEE(Phala, Marlin) 환경에서 에이전트 코드를 실행하고 온체인에 증명서를 기록
- LLM 추론 해시 체인으로 모든 의사결정의 무결성 검증
- Commit-Reveal 방식으로 시그널 프론트러닝 방지
- 승인된 코드 해시와 증명자만 검증 가능

### 2. 멀티 에이전트 경제 (Multi-Agent Economy)

- 애널리스트가 MNT를 스테이킹하고 시그널을 게시
- 성과 기반 수수료 분배 및 평판 시스템
- 실패 시 스테이킹된 자산 슬래싱
- 보험 풀을 통한 사용자 손실 보상
- ABNK 토큰 기반 거버넌스 투표

### 3. Intent 아키텍처 (Intent Architecture)

- 사용자가 투자 의향(Intent)을 게시하면 솔버들이 경매 방식으로 입찰
- 30분 경매 후 최고 APY 제안자가 선정
- 패배한 입찰자의 보증금(Bond)은 자동 환불
- ERC-4626 볼트를 통한 자동 예치
- 만료된 Intent는 사용자에게 전액 환불

### 4. 크로스체인 (Cross-Chain)

- LayerZero OFT를 통한 ABNK 토큰 크로스체인 전송
- Solana 수익률 데이터를 Mantle 컨텍스트로 브릿지
- 멀티체인 진입점(Cross-Chain Entrypoint)을 통한 통합 접근

### 5. ABNK 토큰 (Token Economy)

- 총 공급량 1억 개, 역할 기반 민팅/소각
- ERC20Permit + ERC20Votes 지원
- VotingEscrow (veABNK): 최대 4년 락업으로 투표권 획득
- 투표권은 잔여 락업 기간에 비례하여 선형 감소

---

## 5개 에이전트

| 에이전트 | 역할 | 실행 주기 |
|---|---|---|
| **Analyst** (x3) | 멀티모델 분석 (DeepSeek V3 + Llama 3 + Qwen), 전략 시그널 생성 | 60분마다 (교대) |
| **Executor** | DEX 어댑터를 통한 콜데이터 빌드, Guard에 제출 후 볼트를 통해 실행 | 15분마다 |
| **Guard** | 사전 위험 점검 (9개 체크) + 슬래싱 집행 + 오라클 검증 | 실시간 |
| **Allocator** | 멀티티어 수익 분배 + RWA 리밸런싱 + 전략 배포 | 24시간마다 |
| **Circuit Breaker** | TVL 하락, 오라클 편차, 블록 비율 이상 모니터링 | 실시간 |

---

## 아키텍처

```
                    ┌─────────────────────────────────────┐
                    │     Intent Router (M24)              │
                    │  사용자 Intent → 솔버 경매 → 볼트 예치  │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AgentBank Vault V2 (ERC-4626)                  │
│  - 실제 수익률 (assets/share 증가 방식)                            │
│  - 3개 티어: Conservative / Balanced / Aggressive                 │
│  - 셀렉터 화이트리스트 기반 외부 호출 제한                           │
└────┬────────────────────────────────────────────────────────┬───┘
     │                                                         │
     ▼                                                         ▼
┌──────────────────┐              ┌──────────────────────────────┐
│ DEX Adapter      │              │ TEE Attestation Verifier (M20)│
│ - 1inch / Agni   │              │ - Phala / Marlin 증명 검증      │
│ - Permit2 지원    │              │ - 코드 해시 승인                 │
└──────────────────┘              └──────────────────────────────┘
     ▲                                          ▲
     │                                          │
┌────────────────────────┐    ┌──────────────────────────────────┐
│ Executor Agent         │    │ CommitRevealSignal (M28)          │
│ - 콜데이터 빌드         │    │ - 5블록 딜레이 Commit-Reveal       │
│ - Guard에 제출          │    │ - 프론트러닝 방지                   │
└────────────────────────┘    └──────────────────────────────────┘
              │
              ▼
┌────────────────────────┐    ┌──────────────────────────────────┐
│ VotingEscrow (M21)     │    │ ABNK Token (M21)                 │
│ - veABNK 락업          │    │ - 거버넌스 토큰                     │
│ - 선형 투표권 감소      │    │ - Permit + Votes                   │
└────────────────────────┘    └──────────────────────────────────┘
```

---

## V3 신규 스마트 컨트랙트

| 컨트랙트 | 모듈 | 설명 |
|---|---|---|
| `ABNKToken.sol` | M21 | ERC20 거버넌스 토큰 (Permit, Votes, 역할 기반 Mint/Burn) |
| `VotingEscrow.sol` | M21 | Curve 스타일 veToken 락업, 선형 투표권 감소 |
| `IntentRouter.sol` | M24 | Intent 기반 경매 라우터 (솔버 입찰, 자동 정산) |
| `SolverRegistry.sol` | M24 | 솔버 등록/해제, 스테이킹, 평판 관리 |
| `TEEAttestationVerifier.sol` | M20 | TEE 실행 증명 검증 (ECDSA 서명) |
| `CommitRevealSignal.sol` | M28 | 5블록 딜레이 Commit-Reveal 시그널 |
| `SignalAuctionHouse.sol` | M24 | 시그널 경매 |
| `AgentBankOFT.sol` | M25 | LayerZero OFT 크로스체인 토큰 |
| `CrossChainEntrypoint.sol` | M25 | 크로스체인 진입점 |
| `SignalNFT.sol` | M26 | 시그널을 NFT로 발행 |
| `FeeDistributor.sol` | M22 | 수수료 분배 |
| `AntiSybilGuard.sol` | M29 | 시빌 공격 방지 |

---

## 시작하기

### 사전 요구사항

- Node.js 18+
- Python 3.11+
- Foundry (forge, cast, anvil)
- Git

### 설치

```bash
git clone https://github.com/0xCaptain888/agentbank
cd agentbank

# Solidity/Hardhat 종속성 설치
npm install

# Python 종속성 설치
pip install -r requirements.txt

# Foundry 종속성 설치
forge install
```

### 환경 설정

```bash
cp .env.example .env
# 다음 항목을 채워주세요:
#   OWNER_PRIVATE_KEY (배포 지갑)
#   ANALYST_PRIVATE_KEY, EXECUTOR_PRIVATE_KEY, GUARD_PRIVATE_KEY
#   DEEPSEEK_API_KEY, TOGETHER_API_KEY, DASHSCOPE_API_KEY
#   TELEGRAM_BOT_TOKEN, PRIVY_APP_ID, PRIVY_APP_SECRET
#   PYTH_ENDPOINT
```

### 컴파일 및 테스트

```bash
# Hardhat
npx hardhat compile
npx hardhat test

# Foundry
forge build
forge test --fuzz-runs 1000

# V3 테스트만 실행
forge test --match-path test/v3/*.t.sol -vvv
```

### 배포

```bash
# 테스트넷
npx hardhat run scripts/deploy_v2_testnet.js --network mantle_sepolia

# 메인넷
npx hardhat run scripts/deploy_v2_mainnet.js --network mantle
```

### 에이전트 실행

```bash
python orchestrator.py
```

---

## 보안

AgentBank V3는 다층 보안 아키텍처를 채택합니다:

| 보안 메커니즘 | 설명 |
|---|---|
| **TEE 증명** | 에이전트 코드가 신뢰 실행 환경에서 실행되었음을 온체인에서 검증 |
| **Commit-Reveal** | 시그널 프론트러닝을 5블록 딜레이로 방지 |
| **Circuit Breaker** | 일일 PnL 임계값 초과 시 모든 작업 자동 일시정지 |
| **48시간 Timelock** | 모든 거버넌스/파라미터 변경에 48시간 지연 적용 |
| **에이전트 슬래싱** | 악의적 행위자는 스테이킹된 MNT를 잃음 |
| **보험 풀** | 에이전트 실패로 인한 사용자 손실을 슬래싱 자금으로 보상 |
| **셀렉터 화이트리스트** | 사전 승인된 (target, selector) 쌍만 실행 가능 |
| **MEV 보호** | 30초 유효성 + 최소 수량(minAmountOut)으로 샌드위치 공격 방어 |
| **AntiSybilGuard** | 시빌 공격 방지 메커니즘 |
| **14일 언스테이크 지연** | 에이전트가 악의적 행동 후 빠르게 이탈하는 것을 방지 |

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| **체인** | Mantle (chainId 5000/5003) |
| **컨트랙트** | Solidity ^0.8.24, OpenZeppelin v5, Hardhat + Foundry |
| **에이전트** | Python 3.11, web3.py, APScheduler |
| **LLM** | DeepSeek V3, Llama 3 (Groq), Qwen 2.5 (DashScope) |
| **오라클** | Pyth Network (실시간 + TWAP + 이상 감지) |
| **DEX** | 1inch, Merchant Moe v2, Agni Finance v3 |
| **표준** | ERC-4626, ERC-8004, ERC20Permit, ERC20Votes, LayerZero OFT |
| **크로스체인** | LayerZero, Solana 브릿지 |
| **거버넌스** | veABNK (VotingEscrow), 48h Timelock |
| **테스팅** | Hardhat (단위/통합) + Foundry (불변량/퍼징) |

---

## 링크

- **GitHub**: [github.com/0xCaptain888/agentbank](https://github.com/0xCaptain888/agentbank)
- **Mantle Explorer**: [explorer.mantle.xyz](https://explorer.mantle.xyz)
- **ERC-8004 스펙**: 아이덴티티 + 평판 + 검증의 3개 레지스트리 표준
- **Pyth Network**: [pyth.network](https://pyth.network)
- **LayerZero**: [layerzero.network](https://layerzero.network)

---

## 라이선스

MIT — [LICENSE](LICENSE) 참조
