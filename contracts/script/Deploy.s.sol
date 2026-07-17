// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {CrowdCart} from "../src/CrowdCart.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        CrowdCart crowdCart = new CrowdCart();
        vm.stopBroadcast();
        console2.log("CrowdCart deployed at:", address(crowdCart));
    }
}
