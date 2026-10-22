// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title Porkelon
 * @dev UUPS-upgradeable ERC20 token. Renamed from EssentialToken — logic and
 * storage layout are identical to the original implementation, so this is a
 * safe upgrade for the existing proxy.
 *
 * Storage layout (MUST NOT CHANGE ORDER):
 *   [ERC20Upgradeable slots] -> [ERC20Burnable: none] -> [ERC20Pausable: _paused]
 *   -> [OwnableUpgradeable: _owner] -> [Initializable] -> [UUPSUpgradeable]
 *   -> _blocked (this contract) -> _maxSupply (this contract)
 */
contract PorkelonRenamed is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    mapping(address => bool) private _blocked;
    uint256 private _maxSupply;

    event BlockedAccount(address indexed _account);
    event UnblockedAccount(address indexed _account);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply,
        uint256 _maxSupply
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        // Note: OZ ERC20Upgradeable hardcodes 18 decimals; _decimals param
        // is accepted for interface compatibility.
        _maxSupply = _maxSupply;
        _mint(_owner, _initialSupply);
    }

    function maxSupply() public view returns (uint256) {
        return _maxSupply;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= _maxSupply, "Exceeds max supply");
        _mint(to, amount);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function blockAccount(address _account) public onlyOwner {
        _blocked[_account] = true;
        emit BlockedAccount(_account);
    }

    function unblockAccount(address _account) public onlyOwner {
        _blocked[_account] = false;
        emit UnblockedAccount(_account);
    }

    function isAccountBlocked(address _account) public view returns (bool) {
        return _blocked[_account];
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        require(!_blocked[from] && !_blocked[to], "Account is blocked");
        super._update(from, to, value);
    }
}
