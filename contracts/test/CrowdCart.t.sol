// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CrowdCart} from "../src/CrowdCart.sol";

contract CrowdCartTest is Test {
    CrowdCart internal cart;
    address internal organizer = makeAddr("organizer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        cart = new CrowdCart();
        vm.deal(organizer, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function _create(uint256 target, uint256 duration) internal returns (uint256 id) {
        vm.prank(organizer);
        id = cart.createCart("Shared vacuum", target, block.timestamp + duration);
    }

    function test_createAndContributeAndWithdraw() public {
        uint256 id = _create(10 ether, 1 days);

        vm.prank(alice);
        cart.contribute{value: 6 ether}(id);
        vm.prank(bob);
        cart.contribute{value: 4 ether}(id);

        uint256 beforeBal = organizer.balance;
        vm.prank(organizer);
        cart.withdraw(id);
        assertEq(organizer.balance, beforeBal + 10 ether);

        CrowdCart.CartView memory view_ = cart.getCart(id);
        assertTrue(view_.withdrawn);
        assertEq(view_.raised, 10 ether);
    }

    function test_refundAfterUnderfundedDeadline() public {
        uint256 id = _create(10 ether, 1 days);

        vm.prank(alice);
        cart.contribute{value: 3 ether}(id);

        vm.warp(block.timestamp + 1 days + 1);

        uint256 before = alice.balance;
        vm.prank(alice);
        cart.claimRefund(id);
        assertEq(alice.balance, before + 3 ether);
        assertEq(cart.contributionOf(id, alice), 0);
    }

    function test_cannotWithdrawUnderTarget() public {
        uint256 id = _create(10 ether, 1 days);
        vm.prank(alice);
        cart.contribute{value: 5 ether}(id);

        vm.prank(organizer);
        vm.expectRevert(CrowdCart.TargetNotMet.selector);
        cart.withdraw(id);
    }

    function test_cannotContributeAfterDeadline() public {
        uint256 id = _create(10 ether, 1 days);
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(alice);
        vm.expectRevert(CrowdCart.DeadlinePassed.selector);
        cart.contribute{value: 1 ether}(id);
    }

    function test_nonOrganizerCannotWithdraw() public {
        uint256 id = _create(5 ether, 1 days);
        vm.prank(alice);
        cart.contribute{value: 5 ether}(id);

        vm.prank(alice);
        vm.expectRevert(CrowdCart.NotOrganizer.selector);
        cart.withdraw(id);
    }

    function test_openRefundsThenClaim() public {
        uint256 id = _create(10 ether, 1 hours);
        vm.prank(bob);
        cart.contribute{value: 2 ether}(id);

        vm.warp(block.timestamp + 1 hours + 1);
        cart.openRefunds(id);

        uint256 before = bob.balance;
        vm.prank(bob);
        cart.claimRefund(id);
        assertEq(bob.balance, before + 2 ether);
    }
}
