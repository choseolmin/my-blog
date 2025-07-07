let compiler;

self.onmessage = async function (e) {
  const { command, code, name } = e.data;

  if (command === 'compile') {
    if (!compiler) {
      const response = await fetch('https://solc-bin.ethereum.org/bin/soljson-v0.8.21+commit.d9974bed.js');
      const scriptText = await response.text();
      importScripts(URL.createObjectURL(new Blob([scriptText], { type: 'application/javascript' })));
      compiler = self.Module;
    }

    try {
      const input = {
        language: 'Solidity',
        sources: {
          'Contract.sol': {
            content: code,
          },
        },
        settings: {
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode'],
            },
          },
        },
      };

      const output = JSON.parse(compiler.compile(JSON.stringify(input)));

      if (output.errors && output.errors.some(e => e.severity === 'error')) {
        const errorMessage = output.errors.find(e => e.severity === 'error').formattedMessage;
        self.postMessage({ error: errorMessage });
        return;
      }

      const contract = output.contracts['Contract.sol'][name];
      const abi = contract.abi;
      const bytecode = contract.evm.bytecode.object;

      self.postMessage({ abi, bytecode });
    } catch (err) {
      self.postMessage({ error: err.message });
    }
  }
};
