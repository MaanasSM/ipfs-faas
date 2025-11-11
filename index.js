BigInt.prototype.toJSON = function() { return this.toString(); };

const express = require('express');
const { create } = require('ipfs-http-client');
const Web3Module = require('web3');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Setup Web3 with fallback for default export compatibility
const Web3 = Web3Module.default || Web3Module;
const web3 = new Web3(process.env.GANACHE_RPC);

const contractABI = [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "functions",
      "outputs": [
        {
          "internalType": "string",
          "name": "cid",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "uploader",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_cid",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        }
      ],
      "name": "registerFunction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "index",
          "type": "uint256"
        }
      ],
      "name": "getFunction",
      "outputs": [
        {
          "internalType": "string",
          "name": "cid",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "uploader",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    }
  ];
const contractAddress = '0xe8Bc95808507b4D3b21caA58c29a9830CF291AF0';
const contract = new web3.eth.Contract(contractABI, contractAddress);

// Setup IPFS client
const ipfs = create(process.env.IPFS_API + "/api/v0");

// Configure multer storage for better file management
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp + original extension
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

const app = express();
app.use(express.json());


// ===== 8. CORS & STATIC FILES (add this AFTER app.use(express.json())) =====
// const pathModule = require('path');
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:5500',    // Live Server port
    'http://localhost:5500'      // Alternative
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));


// Root route - basic health check
app.get('/', (req, res) => {
  res.send('FaaS Backend Running');
});

// Status route to check IPFS and Ganache connectivity
app.get('/api/status', async (req, res) => {
  try {
    const ganacheAccounts = await web3.eth.getAccounts();
    const ipfsVersion = await ipfs.version();
    res.json({
      ganache: { ok: true, accounts: ganacheAccounts.slice(0, 2) },
      ipfs: { ok: true, version: ipfsVersion.version },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.toString() });
  }
});



app.post('/api/register', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.body.name) {
      return res.status(400).json({ error: 'File and function name required' });
    }

    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fs.statSync(filePath).size;

    // Detect encoding issues
    let dataToUpload;
    try {
      const text = fileBuffer.toString('utf8');
      if (/^\d+(,\d+)*$/.test(text.trim())) {
        const bytes = text.split(',').map(Number);
        dataToUpload = Buffer.from(bytes);
      } else {
        dataToUpload = fileBuffer;
      }
    } catch {
      dataToUpload = fileBuffer;
    }

    // Upload to IPFS
    const result = await ipfs.add(dataToUpload);
    const cid = result.cid.toString();
    fs.unlinkSync(filePath);

    // Register function in contract
    let txHash, receipt;
    try {
      const accounts = await web3.eth.getAccounts();
      receipt = await contract.methods.registerFunction(cid, req.body.name).send({ from: accounts[0], gas: 500000 });
      txHash = receipt.transactionHash;
    } catch (error) {
      txHash = null;
      receipt = null;
    }

    // === GAS ESTIMATION SECTION ===
    const baseGas = 21000;
    const calldataGas = fileSize * 16;
    const storageGas = Math.ceil(fileSize / 32) * 20000;
    const miscGas = 5000;
    const estOnChainGas = baseGas + calldataGas + storageGas + miscGas;

    const actualGas = receipt ? Number(receipt.gasUsed) : 0;
    const gasSaved = estOnChainGas - actualGas;
    const gasSavedPercent = actualGas > 0 ? ((gasSaved / estOnChainGas) * 100).toFixed(2) : 0;

    // === REAL-WORLD COST ESTIMATION ===
    const gasPriceWei = await web3.eth.getGasPrice(); // wei per gas
    const gasPriceEth = Number(web3.utils.fromWei(gasPriceWei, 'ether')); // ETH per gas

    // Fetch ETH to USD from CoinGecko
    let ethUsdRate = 3500; // fallback
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
      const data = await response.json();
      ethUsdRate = data.ethereum.usd;
    } catch (err) {
      console.warn("⚠️ Could not fetch ETH-USD rate, using fallback", err);
    }

    const ethCostOnChain = estOnChainGas * gasPriceEth;
    const ethCostActual = actualGas * gasPriceEth;
    const usdCostOnChain = ethCostOnChain * ethUsdRate;
    const usdCostActual = ethCostActual * ethUsdRate;
    const usdSaved = usdCostOnChain - usdCostActual;

    // === RESPONSE ===
    res.json({
      message: 'Function uploaded & registered',
      ipfsCid: cid,
      functionName: req.body.name,
      transactionHash: txHash,
      fileSize,
      gasSaved,
      gasSavedPercent,
      estimatedOnChainCost: estOnChainGas,
      actualCost: actualGas,
      costReductionMultiple: actualGas > 0 ? (estOnChainGas / actualGas).toFixed(1) : 0,
      ethUsdRate,
      usdCostOnChain: usdCostOnChain.toFixed(4),
      usdCostActual: usdCostActual.toFixed(4),
      usdSaved: usdSaved.toFixed(4)
    });

  } catch (err) {
    res.status(500).json({ message: 'Error registering function', error: err.toString() });
  }
});



app.get('/api/test', async (req, res) => {
  try {
    const count = await contract.methods.getCount().call();
    console.log('Count:', count);
    if (count == 0) return res.json({ message: 'No functions registered' });

    const entry = await contract.methods.getFunction(0).call();
    console.log('Entry:', entry);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});



app.get('/api/functions', async (req, res) => {
  try {
    const count = await contract.methods.getCount().call();
    const result = [];
    for (let i = 0; i < count; i++) {
      const entry = await contract.methods.getFunction(i).call();
      console.log('Function entry:', entry); // This will show the returned structure.
      result.push({
        cid: entry.cid || entry[0],
        uploader: entry.uploader || entry[1],
        timestamp: entry.timestamp || entry[2],
        name: entry.name || entry[3]
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});


app.post('/api/invoke', async (req, res) => {
  try {
    const { name, cid } = req.body;
    if (!name && !cid) {
      return res.status(400).json({ error: 'Provide a function name or cid' });
    }

    // 1️⃣ Find function entry using name or cid
    const count = await contract.methods.getCount().call();
    let func = null;

    for (let i = 0; i < count; i++) {
      const entry = await contract.methods.getFunction(i).call();
      if ((name && entry.name === name) || (cid && entry.cid === cid)) {
        func = entry;
        break;
      }
    }

    if (!func) return res.status(404).json({ error: 'Function not found' });

    // 2️⃣ Fetch source code from IPFS (properly decode)
    const chunks = [];
    for await (const chunk of ipfs.cat(func.cid)) {
      chunks.push(chunk);
    }
    const code = Buffer.concat(chunks).toString("utf8");

    console.log("=== RAW CODE FROM IPFS ===\n", code);

    // 3️⃣ Parse input args
    let input = req.body.input || [];
    if (!Array.isArray(input)) input = [input];

    // 4️⃣ Execute code safely in sandbox
    const vm = require('vm');
    let result, error;

    try {
      // Remove comments/blank lines
      let codeToEval = code
        .split('\n')
        .filter(line => !line.trim().startsWith('//') && line.trim() !== '')
        .join('\n')
        .trim();

      // Strip `module.exports =` if present
      if (codeToEval.startsWith('module.exports =')) {
    codeToEval = codeToEval.substring('module.exports ='.length).trim();
    }

    // remove trailing semicolon if any
    if (codeToEval.endsWith(';')) {
    codeToEval = codeToEval.slice(0, -1);
    }

    codeToEval = '(' + codeToEval + ')';


      // Run in a secure VM context
      const fn = vm.runInNewContext(codeToEval, {}, { timeout: 500 });
      result = await Promise.resolve(fn(...input));

    } catch (e) {
      error = e.toString();
      result = undefined;
    }

    // 5️⃣ Respond with result
    res.json({
      status: error ? 'error' : 'success',
      output: error || result,
      functionName: func.name,
      cid: func.cid
    });

  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ready at http://localhost:${PORT}`);
});
