# AgentBank V3

> **Mantle Turing Test Hackathon 2026 · Agentic Wallets & Economy · 目标一等奖 $8,500**

基于 Mantle 构建的多智能体自治金库系统，集成可验证 AI 推理、Intent 意图架构、跨链执行和治理代币经济。

[![Deployed on Mantle](https://img.shields.io/badge/Deployed-Mantle%20Mainnet-00D395)](https://explorer.mantle.xyz)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-Three%20Registries-purple)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 项目简介

AgentBank 是一个多 AI 智能体协作的 DeFi 资产自主管理协议。每个智能体在链上拥有注册身份，所有 LLM 推理过程通过哈希链可验证地记录在链上。V3 版本新增了 TEE（可信执行环境）证明、Intent 路由、veToken 治理、Commit-Reveal 信号机制，大幅提升了协议的安全性和去中心化程度。

---

## 已部署合约（Mantle 主网）

所有合约已部署到 Mantle 主网 (chainId 5000)。部署者：[`0x2F9fDE6B...809C3b`](https://mantlescan.xyz/address/0x2F9fDE6B6FB8d7353aB80F082f85F0d70B809C3b)

### V2 核心合约

| 合约 | 地址 | 浏览器 |
|---|---|---|
| IdentityRegistry | `0x7058132Ba4aE19983c61590644F2943A3B7fDf80` | [查看](https://mantlescan.xyz/address/0x7058132Ba4aE19983c61590644F2943A3B7fDf80) |
| ReputationRegistry | `0x494960e21058290BB2F1328b6b837dCF26aA5DCb` | [查看](https://mantlescan.xyz/address/0x494960e21058290BB2F1328b6b837dCF26aA5DCb) |
| LLMReasoningRegistry | `0x8a8C3532359aAACb6C3a1060deF4938F6006c8F1` | [查看](https://mantlescan.xyz/address/0x8a8C3532359aAACb6C3a1060deF4938F6006c8F1) |
| SignalBoardV2 | `0x2A46cF6493b377D45908254B0528e38990AA323f` | [查看](https://mantlescan.xyz/address/0x2A46cF6493b377D45908254B0528e38990AA323f) |
| AgentBankVaultV2 | `0xC44C061D257Af305dEAea2eD093E878a615d856d` | [查看](https://mantlescan.xyz/address/0xC44C061D257Af305dEAea2eD093E878a615d856d) |

### V3 扩展合约

| 合约 | 地址 | 浏览器 |
|---|---|---|
| AlloraConsumer | `0x38F2AbD24b8125779Cb6a933E9A87A97be5b0e1A` | [查看](https://mantlescan.xyz/address/0x38F2AbD24b8125779Cb6a933E9A87A97be5b0e1A) |
| OpenGradientReader | `0xD23CaFB0B8a10A3eafe061bAe93AA2A923B322F3` | [查看](https://mantlescan.xyz/address/0xD23CaFB0B8a10A3eafe061bAe93AA2A923B322F3) |
| TEEAttestationVerifier | `0x51E52dCBD0FBfaDaDB43ad1EB1Ea0d3A79f128c3` | [查看](https://mantlescan.xyz/address/0x51E52dCBD0FBfaDaDB43ad1EB1Ea0d3A79f128c3) |
| ABNKToken | `0x5C101D893c2860067b010b615E3a6812439f85F8` | [查看](https://mantlescan.xyz/address/0x5C101D893c2860067b010b615E3a6812439f85F8) |
| VotingEscrow | `0x06649c4a2194eE9736c2139AAFE6D10033154F9a` | [查看](https://mantlescan.xyz/address/0x06649c4a2194eE9736c2139AAFE6D10033154F9a) |
| FeeDistributor | `0x16c65fbe4220F0D0EC7cbB47Ad9B2956DbA9886d` | [查看](https://mantlescan.xyz/address/0x16c65fbe4220F0D0EC7cbB47Ad9B2956DbA9886d) |
| SolverRegistry | `0xB864B5Aa1E2164D93B491f5f62902120FAf1Ab52` | [查看](https://mantlescan.xyz/address/0xB864B5Aa1E2164D93B491f5f62902120FAf1Ab52) |
| IntentRouter | `0x9582d2dF303ec2B1fab104A77E249C05571fccC9` | [查看](https://mantlescan.xyz/address/0x9582d2dF303ec2B1fab104A77E249C05571fccC9) |
| SignalNFT | `0x185346Bd15223740dA8D6D7A11F18b1c93971525` | [查看](https://mantlescan.xyz/address/0x185346Bd15223740dA8D6D7A11F18b1c93971525) |
| SignalAuctionHouse | `0xfcc6bE4Dfc45322b8C99fFFB255C1DEcd8f07907` | [查看](https://mantlescan.xyz/address/0xfcc6bE4Dfc45322b8C99fFFB255C1DEcd8f07907) |
| AntiSybilGuard | `0x2fc6e0987bF58F5A0Dc76801A9556Ab62bD42049` | [查看](https://mantlescan.xyz/address/0x2fc6e0987bF58F5A0Dc76801A9556Ab62bD42049) |
| CommitRevealSignal | `0x2A7D252D0bFF31eC1098FF642C0934b7124a5A33` | [查看](https://mantlescan.xyz/address/0x2A7D252D0bFF31eC1098FF642C0934b7124a5A33) |

### 已注册智能体

| 智能体 | 地址 | 浏览器 |
|---|---|---|
| Analyst (DeepSeek V4) | `0xc7e424c1e4b346c06a35241e7bca469477483683` | [查看](https://mantlescan.xyz/address/0xc7e424c1e4b346c06a35241e7bca469477483683) |
| Executor | `0x4c9cef3bc7f5455d2581b717f115b2c76fc1d092` | [查看](https://mantlescan.xyz/address/0x4c9cef3bc7f5455d2581b717f115b2c76fc1d092) |
| Guard | `0xc2203fd52c6f2a4429a22aa2eec78d4d2db72a59` | [查看](https://mantlescan.xyz/address/0xc2203fd52c6f2a4429a22aa2eec78d4d2db72a59) |
| Allocator | `0x6f3d2708e59491db653ec794b54c775f390b3dc0` | [查看](https://mantlescan.xyz/address/0x6f3d2708e59491db653ec794b54c775f390b3dc0) |

### 链上活动摘要

> 主网 56+ 笔交易覆盖所有协议模块 — [查看部署者活动](https://mantlescan.xyz/address/0x2F9fDE6B6FB8d7353aB80F082f85F0d70B809C3b)

| 活动类型 | 数量 | 示例交易 |
|---|---|---|
| 智能体身份注册 | 5 | [`0x6fa952f3...`](https://mantlescan.xyz/tx/0x6fa952f39d120e27b874f19b244eeae5aaad02d66ed5686fd5af4a6283d75eee) |
| LLM 推理记录（哈希链） | 5 | [`0x35ebdceb...`](https://mantlescan.xyz/tx/0x35ebdcebadc55147bfaa838fbf7890f8743581fa76a67965c4225ece773c48e3) |
| 交易信号（BUY/SELL/HOLD） | 8 | [`0x9dafdc02...`](https://mantlescan.xyz/tx/0x9dafdc02fddf338acc5eab4d2ed4c3bc7b73faae3203519c5bfbc8be3341aa56) |
| TEE 认证（Phala SGX） | 3 | [`0xd98d6aa4...`](https://mantlescan.xyz/tx/0xd98d6aa4e2e75b0ffcff96a787c689176156953d7370cad3f6b5bbc52bb035b5) |
| ABNK 代币转账 | 4 | [`0x2f28a8ab...`](https://mantlescan.xyz/tx/0x2f28a8abb0504e98e3f3d44cc5805593ba13fd90b63543e4849238759cb7b9ab) |
| veABNK 锁仓（100 万 ABNK，1 年） | 1 | [`0x68c78438...`](https://mantlescan.xyz/tx/0x68c78438f260a35e286b4dc9628390894853c155942cc9fdc9b3349b06bd868f) |
| Signal NFT 铸造 | 3 | [`0x7a58c31c...`](https://mantlescan.xyz/tx/0x7a58c31cebf87e0ee04c853f5bc32b02aafbc2f3e79e31babed61e1f7319248f) |
| Commit-Reveal 信号 | 3 | [`0x11de1d6c...`](https://mantlescan.xyz/tx/0x11de1d6c5bff6a3161e57c11411afbce8998d57bd22bf1ce491ff846883ee5e9) |
| 声誉反馈 | 10 | [`0xc41d0f25...`](https://mantlescan.xyz/tx/0xc41d0f25d20e581b88a12ddf654a883c73462116a2d2b1135af50963350fc989) |
| 权限配置 | ~13 | — |

---

## 核心功能

### 1. 可验证 AI (Verifiable AI)

- 在 TEE 环境（Phala、Marlin）中执行智能体代码，并在链上记录证明
- 通过 LLM 推理哈希链验证所有决策的完整性
- Commit-Reveal 机制防止信号抢跑
- 仅允许经审批的代码哈希和证明者通过验证

### 2. 多智能体经济 (Multi-Agent Economy)

- 分析师质押 MNT 发布信号
- 基于绩效的手续费分配和声誉系统
- 失败时削减质押资产（Slashing）
- 通过保险池补偿用户损失
- 基于 ABNK 代币的治理投票

### 3. Intent 意图架构 (Intent Architecture)

- 用户发布投资意图（Intent），求解器（Solver）以拍卖方式竞标
- 30 分钟拍卖结束后选出最高 APY 的提案者
- 失败竞标者的保证金（Bond）自动退还
- 通过 ERC-4626 金库自动存入
- 过期的 Intent 全额退还用户

### 4. 跨链 (Cross-Chain)

- 通过 LayerZero OFT 实现 ABNK 代币跨链转移
- 将 Solana 收益率数据桥接到 Mantle 上下文
- 通过跨链入口点（Cross-Chain Entrypoint）实现统一访问

### 5. ABNK 代币 (Token Economy)

- 总供应量 1 亿枚，基于角色的铸造/销毁
- 支持 ERC20Permit + ERC20Votes
- VotingEscrow (veABNK)：最长 4 年锁仓获取投票权
- 投票权随剩余锁仓时间线性衰减

---

## 五大智能体

| 智能体 | 角色 | 执行周期 |
|---|---|---|
| **Analyst** (x3) | 多模型分析（DeepSeek V3 + Llama 3 + Qwen），生成策略信号 | 每 60 分钟（轮替） |
| **Executor** | 通过 DEX 适配器构建 calldata，提交给 Guard，通过金库执行 | 每 15 分钟 |
| **Guard** | 预执行风控（9 项检查）+ 罚没执行 + 预言机验证 | 实时 |
| **Allocator** | 多层收益分配 + RWA 再平衡 + 策略部署 | 每 24 小时 |
| **Circuit Breaker** | 监控 TVL 下降、预言机偏差、区块比例异常 | 实时 |

---

## 架构

```
                    ┌─────────────────────────────────────┐
                    │      Intent Router (M24)             │
                    │  用户 Intent → 求解器拍卖 → 金库存入   │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AgentBank Vault V2 (ERC-4626)                  │
│  - 真实收益（通过 assets/share 增值实现）                          │
│  - 3 个层级：Conservative / Balanced / Aggressive                │
│  - 基于选择器白名单的外部调用限制                                   │
└────┬────────────────────────────────────────────────────────┬───┘
     │                                                         │
     ▼                                                         ▼
┌──────────────────┐              ┌──────────────────────────────┐
│ DEX Adapter      │              │ TEE Attestation Verifier (M20)│
│ - 1inch / Agni   │              │ - Phala / Marlin 证明验证      │
│ - Permit2 支持    │              │ - 代码哈希审批                  │
└──────────────────┘              └──────────────────────────────┘
     ▲                                          ▲
     │                                          │
┌────────────────────────┐    ┌──────────────────────────────────┐
│ Executor Agent         │    │ CommitRevealSignal (M28)          │
│ - 构建 calldata        │    │ - 5 区块延迟 Commit-Reveal         │
│ - 提交给 Guard          │    │ - 防止信号抢跑                     │
└────────────────────────┘    └──────────────────────────────────┘
              │
              ▼
┌────────────────────────┐    ┌──────────────────────────────────┐
│ VotingEscrow (M21)     │    │ ABNK Token (M21)                 │
│ - veABNK 锁仓          │    │ - 治理代币                        │
│ - 线性投票权衰减        │    │ - Permit + Votes                  │
└────────────────────────┘    └──────────────────────────────────┘
```

---

## V3 新增智能合约

| 合约 | 模块 | 说明 |
|---|---|---|
| `ABNKToken.sol` | M21 | ERC20 治理代币（Permit、Votes、角色铸造/销毁） |
| `VotingEscrow.sol` | M21 | Curve 风格 veToken 锁仓，线性投票权衰减 |
| `IntentRouter.sol` | M24 | 基于 Intent 的拍卖路由器（求解器竞标、自动结算） |
| `SolverRegistry.sol` | M24 | 求解器注册/注销、质押、声誉管理 |
| `TEEAttestationVerifier.sol` | M20 | TEE 执行证明验证（ECDSA 签名） |
| `CommitRevealSignal.sol` | M28 | 5 区块延迟 Commit-Reveal 信号 |
| `SignalAuctionHouse.sol` | M24 | 信号拍卖 |
| `AgentBankOFT.sol` | M25 | LayerZero OFT 跨链代币 |
| `CrossChainEntrypoint.sol` | M25 | 跨链入口点 |
| `SignalNFT.sol` | M26 | 将信号铸造为 NFT |
| `FeeDistributor.sol` | M22 | 手续费分配 |
| `AntiSybilGuard.sol` | M29 | 防女巫攻击 |

---

## 快速开始

### 前置要求

- Node.js 18+
- Python 3.11+
- Foundry (forge, cast, anvil)
- Git

### 安装

```bash
git clone https://github.com/0xCaptain888/agentbank
cd agentbank

# 安装 Solidity/Hardhat 依赖
npm install

# 安装 Python 依赖
pip install -r requirements.txt

# 安装 Foundry 依赖
forge install
```

### 环境配置

```bash
cp .env.example .env
# 请填写以下内容：
#   OWNER_PRIVATE_KEY（部署钱包）
#   ANALYST_PRIVATE_KEY, EXECUTOR_PRIVATE_KEY, GUARD_PRIVATE_KEY
#   DEEPSEEK_API_KEY, TOGETHER_API_KEY, DASHSCOPE_API_KEY
#   TELEGRAM_BOT_TOKEN, PRIVY_APP_ID, PRIVY_APP_SECRET
#   PYTH_ENDPOINT
```

### 编译与测试

```bash
# Hardhat
npx hardhat compile
npx hardhat test

# Foundry
forge build
forge test --fuzz-runs 1000

# 仅运行 V3 测试
forge test --match-path test/v3/*.t.sol -vvv
```

### 部署

```bash
# 测试网
npx hardhat run scripts/deploy_v2_testnet.js --network mantle_sepolia

# 主网
npx hardhat run scripts/deploy_v2_mainnet.js --network mantle
```

### 运行智能体

```bash
python orchestrator.py
```

---

## 安全机制

AgentBank V3 采用多层安全架构：

| 安全机制 | 说明 |
|---|---|
| **TEE 证明** | 验证智能体代码在可信执行环境中运行 |
| **Commit-Reveal** | 通过 5 区块延迟防止信号抢跑 |
| **Circuit Breaker** | 日 PnL 超过阈值时自动暂停所有操作 |
| **48 小时 Timelock** | 所有治理/参数变更需等待 48 小时 |
| **智能体罚没** | 恶意行为者将失去质押的 MNT |
| **保险池** | 用罚没资金补偿因智能体失败造成的用户损失 |
| **选择器白名单** | 仅允许预先批准的 (target, selector) 对执行 |
| **MEV 保护** | 30 秒有效期 + minAmountOut 防止三明治攻击 |
| **AntiSybilGuard** | 防女巫攻击机制 |
| **14 天解除质押延迟** | 防止智能体在恶意行为后迅速退出 |

---

## 技术栈

| 层级 | 技术 |
|---|---|
| **链** | Mantle (chainId 5000/5003) |
| **合约** | Solidity ^0.8.24, OpenZeppelin v5, Hardhat + Foundry |
| **智能体** | Python 3.11, web3.py, APScheduler |
| **LLM** | DeepSeek V3, Llama 3 (Groq), Qwen 2.5 (DashScope) |
| **预言机** | Pyth Network（实时 + TWAP + 异常检测） |
| **DEX** | 1inch, Merchant Moe v2, Agni Finance v3 |
| **标准** | ERC-4626, ERC-8004, ERC20Permit, ERC20Votes, LayerZero OFT |
| **跨链** | LayerZero, Solana 桥接 |
| **治理** | veABNK (VotingEscrow), 48h Timelock |
| **测试** | Hardhat（单元/集成）+ Foundry（不变量/模糊测试） |

---

## 链接

- **GitHub**: [github.com/0xCaptain888/agentbank](https://github.com/0xCaptain888/agentbank)
- **Mantle Explorer**: [explorer.mantle.xyz](https://explorer.mantle.xyz)
- **ERC-8004 规范**: 身份 + 声誉 + 验证的三注册表标准
- **Pyth Network**: [pyth.network](https://pyth.network)
- **LayerZero**: [layerzero.network](https://layerzero.network)

---

## 许可证

MIT — 参见 [LICENSE](LICENSE)
