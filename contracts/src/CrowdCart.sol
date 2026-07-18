// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CrowdCart — conditional group purchases
/// @notice Friends pool native MON toward a target. Organizer withdraws if funded;
///         contributors claim refunds if the deadline passes underfunded.
contract CrowdCart {
    struct CartView {
        address organizer;
        uint256 target;
        uint256 deadline;
        uint256 raised;
        bool withdrawn;
        bool refundsOpen;
        string title;
    }

    struct Cart {
        address organizer;
        uint256 target;
        uint256 deadline;
        uint256 raised;
        bool withdrawn;
        bool refundsOpen;
        string title;
        mapping(address => uint256) contributions;
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
        if (cart.withdrawn || cart.refundsOpen) revert AlreadySettled();
        if (block.timestamp > cart.deadline) revert DeadlinePassed();

        cart.contributions[msg.sender] += msg.value;
        cart.raised += msg.value;

        emit Contributed(cartId, msg.sender, msg.value, cart.raised);
    }

    function withdraw(bytes32 cartId) external {
        Cart storage cart = _getCart(cartId);
        if (msg.sender != cart.organizer) revert NotOrganizer();
        if (cart.withdrawn || cart.refundsOpen) revert AlreadySettled();
        if (cart.raised < cart.target) revert TargetNotMet();

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
            title: cart.title
        });
    }

    function contributionOf(bytes32 cartId, address contributor) external view returns (uint256) {
        return _getCart(cartId).contributions[contributor];
    }

    function _getCart(bytes32 cartId) internal view returns (Cart storage cart) {
        cart = carts[cartId];
        if (cart.organizer == address(0)) revert CartNotFound();
    }
}
