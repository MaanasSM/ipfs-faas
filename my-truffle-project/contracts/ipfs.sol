// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract IPFS {
    // Struct to store function metadata
    struct FunctionReg {
        string cid;         // IPFS CID for the function code
        address uploader;   // Address of who registered the function
        uint timestamp;     // When it was registered
        string name;        // User-defined label (e.g. 'hello-world')
    }
    
    FunctionReg[] public functions;

    // Register a new function
    function registerFunction(string memory _cid, string memory _name) public {
        functions.push(FunctionReg({
            cid: _cid,
            uploader: msg.sender,
            timestamp: block.timestamp,
            name: _name
        }));
    }

    // Get the number of registered functions
    function getCount() public view returns (uint) {
        return functions.length;
    }

    // Get function metadata by index
    function getFunction(uint index) public view returns (
        string memory cid,
        address uploader,
        uint timestamp,
        string memory name
    ) {
        require(index < functions.length, "Index out of range");
        FunctionReg storage f = functions[index];
        return (f.cid, f.uploader, f.timestamp, f.name);
    }
}
