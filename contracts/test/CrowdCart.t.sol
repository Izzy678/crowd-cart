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

    function _create(uint256 target, uint256 duration) internal returns (bytes32 id) {
        vm.prank(organizer);
        id = cart.createCart("Shared vacuum", target, block.timestamp + duration);
    }

    function test_createUsesUniqueIds() public {
        bytes32 a = _create(1 ether, 1 days);
        bytes32 b = _create(1 ether, 1 days);
        assertTrue(a != b);
        assertTrue(a != bytes32(0));
    }

    function test_withdrawRequiresMajorityApproval() public {
        bytes32 id = _create(10 ether, 1 days);

        vm.prank(alice);
        cart.contribute{value: 6 ether}(id);
        vm.prank(bob);
        cart.contribute{value: 4 ether}(id);

        vm.prank(organizer);
        cart.requestWithdraw(id);

        // 2 contributors → need 2 approvals
        vm.prank(alice);
        cart.approveWithdraw(id);

        vm.prank(organizer);
        vm.expectRevert(CrowdCart.ApprovalsNotMet.selector);
        cart.executeWithdraw(id);

        vm.prank(bob);
        cart.approveWithdraw(id);

        uint256 beforeBal = organizer.balance;
        cart.executeWithdraw(id);
        assertEq(organizer.balance, beforeBal + 10 ether);

        CrowdCart.CartView memory view_ = cart.getCart(id);
        assertTrue(view_.withdrawn);
        assertEq(view_.raised, 10 ether);
    }

    function test_singleContributorCanSelfApprove() public {
        bytes32 id = _create(5 ether, 1 days);
        vm.prank(alice);
        cart.contribute{value: 5 ether}(id);

        vm.prank(organizer);
        cart.requestWithdraw(id);
        vm.prank(alice);
        cart.approveWithdraw(id);
        cart.executeWithdraw(id);

        assertTrue(cart.getCart(id).withdrawn);
    }

    function test_nonOrganizerCannotRequestWithdraw() public {
        bytes32 id = _create(5 ether, 1 days);
        vm.prank(alice);
        cart.contribute{value: 5 ether}(id);

        vm.prank(alice);
        vm.expectRevert(CrowdCart.NotOrganizer.selector);
        cart.requestWithdraw(id);
    }

    function test_cannotRequestWithdrawUnderTarget() public {
        bytes32 id = _create(10 ether, 1 days);
        vm.prank(alice);
        cart.contribute{value: 5 ether}(id);

        vm.prank(organizer);
        vm.expectRevert(CrowdCart.TargetNotMet.selector);
        cart.requestWithdraw(id);
    }

    function test_refundAfterUnderfundedDeadline() public {
        bytes32 id = _create(10 ether, 1 days);

        vm.prank(alice);
        cart.contribute{value: 3 ether}(id);

        vm.warp(block.timestamp + 1 days + 1);

        uint256 before = alice.balance;
        vm.prank(alice);
        cart.claimRefund(id);
        assertEq(alice.balance, before + 3 ether);
        assertEq(cart.contributionOf(id, alice), 0);
    }

    function test_cannotContributeAfterDeadline() public {
        bytes32 id = _create(10 ether, 1 days);
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(alice);
        vm.expectRevert(CrowdCart.DeadlinePassed.selector);
        cart.contribute{value: 1 ether}(id);
    }

    function test_openRefundsThenClaim() public {
        bytes32 id = _create(10 ether, 1 hours);
        vm.prank(bob);
        cart.contribute{value: 2 ether}(id);

        vm.warp(block.timestamp + 1 hours + 1);
        cart.openRefunds(id);

        uint256 before = bob.balance;
        vm.prank(bob);
        cart.claimRefund(id);
        assertEq(bob.balance, before + 2 ether);
    }

    function test_unknownCartReverts() public {
        vm.expectRevert(CrowdCart.CartNotFound.selector);
        cart.getCart(bytes32(uint256(1)));
    }
}
