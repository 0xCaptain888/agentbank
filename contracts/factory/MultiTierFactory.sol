// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MultiTierFactory is Ownable {

    struct TierConfig {
        string name;
        uint256 maxOpBps;
        uint256 maxDailyLossBps;
        uint256 withdrawCooldown;
        bool    rwaOnly;
        bool    enabled;
    }

    mapping(string => TierConfig) public tiers;
    mapping(string => address) public tierVault;
    string[] public tierNames;

    event TierRegistered(string name, uint256 maxOpBps, uint256 maxDailyLossBps);
    event TierVaultSet(string name, address vault);

    constructor() Ownable(msg.sender) {
        _registerTier("conservative", 500, 100, 1 days, true);
        _registerTier("balanced", 1000, 500, 1 days, false);
        _registerTier("aggressive", 2500, 1500, 2 days, false);
    }

    function _registerTier(string memory name, uint256 maxOpBps, uint256 maxDailyLossBps, uint256 cooldown, bool rwaOnly) internal {
        tiers[name] = TierConfig(name, maxOpBps, maxDailyLossBps, cooldown, rwaOnly, true);
        tierNames.push(name);
        emit TierRegistered(name, maxOpBps, maxDailyLossBps);
    }

    function setTierVault(string calldata name, address vault) external onlyOwner {
        require(tiers[name].enabled, "tier disabled");
        tierVault[name] = vault;
        emit TierVaultSet(name, vault);
    }

    function getAllTiers() external view returns (string[] memory names, address[] memory vaults) {
        names = tierNames;
        vaults = new address[](tierNames.length);
        for (uint i = 0; i < tierNames.length; i++) {
            vaults[i] = tierVault[tierNames[i]];
        }
    }

    function tierCount() external view returns (uint256) { return tierNames.length; }
}
