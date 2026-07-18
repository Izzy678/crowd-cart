// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CrowdCart — conditional group purchases
/// @notice Friends pool native MON toward a target. Organizer can withdraw only after
///         a majority of contributors approve. If the deadline passes underfunded,
///         contributors claim refunds.
contract CrowdCart {
    struct CartView {
        address organizer;
        uint256 target;
        uint256 deadline;
        uint256 raised;
        bool withdrawn;
        bool refundsOpen;
        bool withdrawRequested;
        uint256 contributorCount;
        uint256 approvalCount;
        uint256 approvalsNeeded;
        string title;
    }

    struct Cart {
        address organizer;
        uint256 target;
        uint256 deadline;
        uint256 raised;
        bool withdrawn;
        bool refundsOpen;
        bool withdrawRequested;
        uint256 contributorCount;
        uint256 approvalCount;
        string title;
        mapping(address => uint256) contributions;
        mapping(address => bool) isContributor;
        mapping(address => bool) withdrawApproval;
        address[] contributorList;
    }

    uint256 public cartCount;
    mapping(bytes32 => Cart) private carts;

    event CartCreated(
        bytes32 indexed cartId,
        address indexed organizer,
        uint256 target,
        uint256 deadline,
        string title
    );
    event Contributed(bytes32 indexed cartId, address indexed contributor, uint256 amount, uint256 raised);
    event WithdrawRequested(bytes32 indexed cartId, address indexed organizer);
    event WithdrawApproved(bytes32 indexed cartId, address indexed contributor, uint256 approvalCount, uint256 approvalsNeeded);
    event Withdrawn(bytes32 indexed cartId, address indexed organizer, uint256 amount);
    event RefundsOpened(bytes32 indexed cartId);
    event RefundClaimed(bytes32 indexed cartId, address indexed contributor, uint256 amount);

    error InvalidTarget();
    error InvalidDeadline();
    error EmptyTitle();
    error CartNotFound();
    error DeadlinePassed();
    error AlreadySettled();
    error NotOrganizer();
    error TargetNotMet();
    error RefundsNotAvailable();
    error NothingToRefund();
    error ZeroContribution();
    error TransferFailed();
    error WithdrawNotRequested();
    error WithdrawAlreadyRequested();
    error NotContributor();
    error AlreadyApproved();
    error ApprovalsNotMet();

    function createCart(string calldata title, uint256 target, uint256 deadline)
        external
        returns (bytes32 cartId)
    {
        if (bytes(title).length == 0) revert EmptyTitle();
        if (target == 0) revert InvalidTarget();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        uint256 n = cartCount++;
        cartId = keccak256(
            abi.encodePacked(msg.sender, title, target, deadline, n, block.timestamp, block.prevrandao)
        );

        Cart storage cart = carts[cartId];
        cart.organizer = msg.sender;
        cart.target = target;
        cart.deadline = deadline;
        cart.title = title;

        emit CartCreated(cartId, msg.sender, target, deadline, title);
    }

    function contribute(bytes32 cartId) external payable {
        Cart storage cart = _getCart(cartId);
        if (msg.value == 0) revert ZeroContribution();
        if (cart.withdrawn || cart.refundsOpen || cart.withdrawRequested) revert AlreadySettled();
        if (block.timestamp > cart.deadline) revert DeadlinePassed();

        if (!cart.isContributor[msg.sender]) {
            cart.isContributor[msg.sender] = true;
            cart.contributorCount += 1;
            cart.contributorList.push(msg.sender);
        }

        cart.contributions[msg.sender] += msg.value;
        cart.raised += msg.value;

        emit Contributed(cartId, msg.sender, msg.value, cart.raised);
    }

    /// @notice Organizer asks to pull the pot. Contributors must approve before execute.
    function requestWithdraw(bytes32 cartId) external {
        Cart storage cart = _getCart(cartId);
        if (msg.sender != cart.organizer) revert NotOrganizer();
        if (cart.withdrawn || cart.refundsOpen) revert AlreadySettled();
        if (cart.withdrawRequested) revert WithdrawAlreadyRequested();
        if (cart.raised < cart.target) revert TargetNotMet();
        if (cart.contributorCount == 0) revert ApprovalsNotMet();

        cart.withdrawRequested = true;
        emit WithdrawRequested(cartId, msg.sender);
    }

    /// @notice Contributor approves the organizer withdrawing the full pot.
    function approveWithdraw(bytes32 cartId) external {
        Cart storage cart = _getCart(cartId);
        if (!cart.withdrawRequested) revert WithdrawNotRequested();
        if (cart.withdrawn || cart.refundsOpen) revert AlreadySettled();
        if (!cart.isContributor[msg.sender]) revert NotContributor();
        if (cart.withdrawApproval[msg.sender]) revert AlreadyApproved();

        cart.withdrawApproval[msg.sender] = true;
        cart.approvalCount += 1;

        emit WithdrawApproved(cartId, msg.sender, cart.approvalCount, _approvalsNeeded(cart.contributorCount));
    }

    /// @notice Anyone may execute once a majority of contributors have approved.
    function executeWithdraw(bytes32 cartId) external {
        Cart storage cart = _getCart(cartId);
        if (!cart.withdrawRequested) revert WithdrawNotRequested();
        if (cart.withdrawn || cart.refundsOpen) revert AlreadySettled();
        if (cart.approvalCount < _approvalsNeeded(cart.contributorCount)) revert ApprovalsNotMet();

        cart.withdrawn = true;
        uint256 amount = cart.raised;

        (bool ok,) = payable(cart.organizer).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(cartId, cart.organizer, amount);
    }

    /// @notice Anyone may open refunds after an underfunded deadline.
    function openRefunds(bytes32 cartId) external {
        Cart storage cart = _getCart(cartId);
        if (cart.withdrawn || cart.refundsOpen) revert AlreadySettled();
        if (block.timestamp <= cart.deadline || cart.raised >= cart.target) {
            revert RefundsNotAvailable();
        }

        cart.refundsOpen = true;
        emit RefundsOpened(cartId);
    }

    function claimRefund(bytes32 cartId) external {
        Cart storage cart = _getCart(cartId);

        if (!cart.refundsOpen) {
            if (cart.withdrawn) revert AlreadySettled();
            if (block.timestamp <= cart.deadline || cart.raised >= cart.target) {
                revert RefundsNotAvailable();
            }
            cart.refundsOpen = true;
            emit RefundsOpened(cartId);
        }

        uint256 amount = cart.contributions[msg.sender];
        if (amount == 0) revert NothingToRefund();

        cart.contributions[msg.sender] = 0;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit RefundClaimed(cartId, msg.sender, amount);
    }

    function getCart(bytes32 cartId) external view returns (CartView memory) {
        Cart storage cart = _getCart(cartId);
        return CartView({
            organizer: cart.organizer,
            target: cart.target,
            deadline: cart.deadline,
            raised: cart.raised,
            withdrawn: cart.withdrawn,
            refundsOpen: cart.refundsOpen,
            withdrawRequested: cart.withdrawRequested,
            contributorCount: cart.contributorCount,
            approvalCount: cart.approvalCount,
            approvalsNeeded: _approvalsNeeded(cart.contributorCount),
            title: cart.title
        });
    }

    function contributionOf(bytes32 cartId, address contributor) external view returns (uint256) {
        return _getCart(cartId).contributions[contributor];
    }

    function getContributors(bytes32 cartId) external view returns (address[] memory) {
        return _getCart(cartId).contributorList;
    }

    function hasApprovedWithdraw(bytes32 cartId, address contributor) external view returns (bool) {
        return _getCart(cartId).withdrawApproval[contributor];
    }

    function _approvalsNeeded(uint256 contributorCount) internal pure returns (uint256) {
        if (contributorCount == 0) return 1;
        return (contributorCount / 2) + 1;
    }

    function _getCart(bytes32 cartId) internal view returns (Cart storage cart) {
        cart = carts[cartId];
        if (cart.organizer == address(0)) revert CartNotFound();
    }
}
