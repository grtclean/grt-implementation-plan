# ZK验证合约部署指南

本指南详细说明如何将VDA191和ISO10218验证合约部署到Polygon zkEVM Cardona测试网。

## 前置条件

### 1. 获取测试网ETH

访问以下水龙头获取Polygon zkEVM Cardona测试网ETH：

- **官方水龙头**: https://faucet.polygon.technology/
- **备用水龙头**: https://www.alchemy.com/faucets/polygon-zkevm-cardona

每次可获取约0.1 ETH，足够部署多个合约。

### 2. 准备部署钱包

1. 创建一个新的以太坊钱包（推荐使用MetaMask）
2. 导出私钥（仅用于测试网，切勿在主网使用）
3. 将私钥保存到环境变量中

### 3. 配置网络

在MetaMask中添加Polygon zkEVM Cardona测试网：

| 参数 | 值 |
|------|-----|
| 网络名称 | Polygon zkEVM Cardona |
| RPC URL | https://rpc.cardona.zkevm-rpc.com |
| 链ID | 2442 |
| 货币符号 | ETH |
| 区块浏览器 | https://cardona-zkevm.polygonscan.com |

## 部署步骤

### 步骤1：安装依赖

```bash
cd /home/ubuntu/grt-implementation-plan/server/blockchain/contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
```

### 步骤2：配置环境变量

创建 `.env` 文件：

```bash
# 部署者私钥（不要包含0x前缀）
DEPLOYER_PRIVATE_KEY=your_private_key_here

# RPC端点
POLYGON_ZKEVM_RPC=https://rpc.cardona.zkevm-rpc.com
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc

# 区块浏览器API密钥（可选，用于合约验证）
POLYGONSCAN_API_KEY=your_api_key_here
```

### 步骤3：编译合约

```bash
npx hardhat compile
```

### 步骤4：部署到Polygon zkEVM Cardona

```bash
npx hardhat run deploy.ts --network polygon_zkevm_cardona
```

部署成功后，控制台将输出合约地址：

```
Deploying contracts to Polygon zkEVM Cardona...
VDA191Verifier deployed to: 0x...
ISO10218Verifier deployed to: 0x...
```

### 步骤5：验证合约（可选）

```bash
npx hardhat verify --network polygon_zkevm_cardona <VDA191_ADDRESS>
npx hardhat verify --network polygon_zkevm_cardona <ISO10218_ADDRESS>
```

## 更新系统配置

部署完成后，更新 `server/blockchain/testnet/polygon_zkevm_config.ts` 中的合约地址：

```typescript
verifierContracts: {
  VDA191: '<部署的VDA191合约地址>',
  ISO10218: '<部署的ISO10218合约地址>',
  Capability: '<部署的Capability合约地址>',
},
```

## 测试验证功能

部署完成后，可以通过以下方式测试：

1. **通过前端界面测试**：
   - 访问 `/capabilities` 页面
   - 点击"验证能力"按钮
   - 查看区块链验证结果

2. **通过API测试**：
   ```bash
   curl -X POST http://localhost:3000/api/trpc/blockchain.verifyCapability \
     -H "Content-Type: application/json" \
     -d '{"capabilityId": "test-capability-1", "proofType": "groth16"}'
   ```

## 故障排除

### 问题1：部署失败 - Gas不足

**解决方案**：从水龙头获取更多测试网ETH。

### 问题2：RPC连接超时

**解决方案**：尝试使用备用RPC端点：
- https://polygon-zkevm-cardona.blockpi.network/v1/rpc/public
- https://rpc.cardona.zkevm-rpc.com

### 问题3：合约验证失败

**解决方案**：确保使用正确的Solidity版本（0.8.19）和优化设置。

## 合约功能说明

### VDA191Verifier

验证VDA 191标准合规性证明：
- `verifyVDA191Compliance(bytes32 proofHash, bytes calldata proof)`: 验证合规性证明
- `getVerificationRecord(bytes32 proofHash)`: 获取验证记录
- `isProofVerified(bytes32 proofHash)`: 检查证明是否已验证

### ISO10218Verifier

验证ISO 10218安全标准合规性证明：
- `verifyISO10218Compliance(bytes32 proofHash, bytes calldata proof)`: 验证安全合规性
- `getVerificationRecord(bytes32 proofHash)`: 获取验证记录
- `isProofVerified(bytes32 proofHash)`: 检查证明是否已验证

## 安全注意事项

1. **私钥安全**：切勿将私钥提交到代码仓库
2. **测试网隔离**：测试网合约仅用于开发测试，不要在主网使用相同的私钥
3. **合约升级**：生产环境部署前，建议使用代理合约模式以支持升级
