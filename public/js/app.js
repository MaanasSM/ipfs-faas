const API_URL = 'http://localhost:3000';

// Tab switching
function showTab(tabName) {
  const tabs = document.querySelectorAll('.tab-content');
  const btns = document.querySelectorAll('.tab-btn');
  
  tabs.forEach(tab => tab.classList.remove('active'));
  btns.forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
  
  if (tabName === 'list') listFunctions();
  if (tabName === 'invoke') listFunctions();
}

// REGISTER
document.getElementById('registerForm').onsubmit = async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  const file = document.getElementById('codeFile').files[0];
  formData.append('file', file);
  formData.append('name', document.getElementById('functionName').value);
  
  try {
    const res = await fetch(`${API_URL}/api/register`, { method: 'POST', body: formData });
    const data = await res.json();
    
    document.getElementById('registerOutput').style.display = 'block';
    document.getElementById('registerResult').textContent = JSON.stringify(data, null, 2);
    
    // Show gas + USD savings card
    if (data.gasSaved) {
      const card = document.getElementById('gasSavingsCard');
      card.style.display = 'block';
      
      document.getElementById('fileSize').textContent = (data.fileSize / 1024).toFixed(2);
      document.getElementById('gasSaved').textContent = data.gasSaved.toLocaleString();
      document.getElementById('costReduction').textContent = data.costReductionMultiple;
      document.getElementById('gasSavedPercent').textContent = data.gasSavedPercent;
      
      // 💲 USD values
      document.getElementById('usdOnChain').textContent = data.usdCostOnChain;
      document.getElementById('usdActual').textContent = data.usdCostActual;
      document.getElementById('usdSaved').textContent = data.usdSaved;
    }
    
    if (data.transactionHash) {
      alert(
        `✅ Function registered successfully!\n` +
        `Gas Saved: ${data.gasSavedPercent}%\n` +
        `USD Saved: $${data.usdSaved}`
      );
    }
    
    document.getElementById('registerForm').reset();
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  }
};

// LIST
async function listFunctions() {
  try {
    const res = await fetch(`${API_URL}/api/functions`);
    const data = await res.json();
    
    const listDiv = document.getElementById('functionsList');
    
    if (data.length === 0) {
      listDiv.innerHTML = '<p style="color: #cbd5e1;">No functions registered yet.</p>';
    } else {
      listDiv.innerHTML = data.map(fn => `
        <div class="function-card">
          <h4>📦 ${fn.name}</h4>
          <p><strong>CID:</strong> <code>${fn.cid.slice(0, 20)}...</code></p>
          <p><strong>Uploader:</strong> <code>${fn.uploader.slice(0, 10)}...</code></p>
          <p><strong>Timestamp:</strong> ${new Date(fn.timestamp * 1000).toLocaleString()}</p>
        </div>
      `).join('');
      
      // Update invoke dropdown
      const select = document.getElementById('functionSelect');
      select.innerHTML = data.map(fn => `<option value="${fn.name}">${fn.name}</option>`).join('');
    }
  } catch (err) {
    alert(`❌ Error loading functions: ${err.message}`);
  }
}

// INVOKE
async function invokeFunction() {
  const name = document.getElementById('functionSelect').value;
  let input = [];
  
  try {
    const inputStr = document.getElementById('invokeInput').value.trim();
    if (inputStr) {
      input = JSON.parse(inputStr);
      if (!Array.isArray(input)) input = [input];
    }
  } catch (err) {
    alert('❌ Invalid input format. Use JSON array: ["arg1", "arg2"]');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, input })
    });
    
    const data = await res.json();
    
    document.getElementById('invokeOutput').style.display = 'block';
    document.getElementById('invokeResult').textContent = JSON.stringify(data, null, 2);
    
    if (data.status === 'success') {
      alert(`✅ Function executed!\nOutput: ${data.output}`);
    } else {
      alert(`❌ Execution error:\n${data.output}`);
    }
  } catch (err) {
    alert(`❌ Error invoking function: ${err.message}`);
  }
}

// Load functions on page load
listFunctions();
