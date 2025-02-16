import React, { useState, useEffect } from 'react';

function InputModal({ isOpen, onClose, onSubmit, code, language }) {
  const [inputs, setInputs] = useState([]);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      const foundInputs = parseCodeForInputs(code, language);
      setInputs(foundInputs);
      setCurrentInputIndex(0);
      setCurrentValue('');
    }
  }, [isOpen, code, language]);

  const parseCodeForInputs = (code, language) => {
    let inputMatches = [];
    let match;
    
    switch (language) {
      case 'python3':
        // Match input() statements with variable names
        const pythonRegex = /(\w+)\s*=\s*input\s*\([^)]*\)/g;
        while ((match = pythonRegex.exec(code)) !== null) {
          inputMatches.push({
            variable: match[1],
            prompt: `Enter value for ${match[1]}`
          });
        }
        break;
        
      case 'cpp':
        // Match cin >> variable statements
        const cppRegex = /cin\s*>>\s*(\w+)/g;
        while ((match = cppRegex.exec(code)) !== null) {
          inputMatches.push({
            variable: match[1],
            prompt: `Enter value for ${match[1]}`
          });
        }
        // Also match scanf statements
        const cppScanfRegex = /scanf\s*\(\s*"[^"]*"\s*,\s*&(\w+)\s*\)/g;
        while ((match = cppScanfRegex.exec(code)) !== null) {
          inputMatches.push({
            variable: match[1],
            prompt: `Enter value for ${match[1]}`
          });
        }
        break;

      case 'c':
        // Match scanf statements for C
        const cScanfRegex = /scanf\s*\(\s*"[^"]*"\s*,\s*&(\w+)\s*\)/g;
        while ((match = cScanfRegex.exec(code)) !== null) {
          inputMatches.push({
            variable: match[1],
            prompt: `Enter value for ${match[1]}`
          });
        }
        break;

      case 'java':
        // Match Scanner nextInt(), nextLine(), etc.
        const scannerRegex = /(\w+)\s*=\s*\w+\.(next(?:Int|Double|Line|Float)*)\(\s*\)/g;
        while ((match = scannerRegex.exec(code)) !== null) {
          inputMatches.push({
            variable: match[1],
            prompt: `Enter value for ${match[1]}`
          });
        }
        // Match BufferedReader readLine()
        const readerRegex = /(\w+)\s*=\s*\w+\.readLine\(\s*\)/g;
        while ((match = readerRegex.exec(code)) !== null) {
          inputMatches.push({
            variable: match[1],
            prompt: `Enter value for ${match[1]}`
          });
        }
        break;

      case 'nodejs':
        // Match process.stdin or readline inputs
        const nodeRegex = /(\w+)\s*=\s*(?:readline\(\)|process\.stdin)/g;
        while ((match = nodeRegex.exec(code)) !== null) {
          inputMatches.push({
            variable: match[1],
            prompt: `Enter value for ${match[1]}`
          });
        }
        break;

      case 'ruby':
        // Match gets and gets.chomp
        const rubyRegex = /(\w+)\s*=\s*gets(?:\.chomp)?\s*/g;
        while ((match = rubyRegex.exec(code)) !== null) {
          inputMatches.push({
            variable: match[1],
            prompt: `Enter value for ${match[1]}`
          });
        }
        break;
        
      default:
        // Generic fallback for other languages
        const genericRegex = /(?:input|scanf|readLine|read)\s*\([^)]*\)/g;
        while ((match = genericRegex.exec(code)) !== null) {
          inputMatches.push({
            variable: `input${inputMatches.length + 1}`,
            prompt: `Enter input value ${inputMatches.length + 1}`
          });
        }
    }
    
    return inputMatches;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (currentInputIndex < inputs.length - 1) {
      inputs[currentInputIndex].value = currentValue;
      setCurrentInputIndex(prev => prev + 1);
      setCurrentValue('');
    } else {
      const finalInputs = [
        ...inputs.slice(0, currentInputIndex),
        { ...inputs[currentInputIndex], value: currentValue }
      ];
      
      const formattedInput = finalInputs
        .map(input => input.value)
        .join('\n');
      
      onSubmit(formattedInput);
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentInput = inputs[currentInputIndex];
  
  return (
    <div className="modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2050
      }}>
      <div className="modal-content bg-dark text-light p-4 rounded" 
        style={{
          width: '90%',
          maxWidth: '500px'
        }}>
        <h4 className="mb-3">Program Input</h4>
        <div className="mb-3">
          <div className="progress mb-3" style={{ height: '2px' }}>
            <div 
              className="progress-bar" 
              style={{ 
                width: `${((currentInputIndex + 1) / inputs.length) * 100}%` 
              }}
            />
          </div>
          <p className="text-muted small">
            Input {currentInputIndex + 1} of {inputs.length}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            {currentInput && (
              <>
                <label htmlFor="programInput" className="form-label">
                  {currentInput.prompt}:
                </label>
                <input
                  type="text"
                  id="programInput"
                  className="form-control bg-dark text-light"
                  style={{
                    border: '2px solidrgb(234, 241, 234)',
                    borderRadius: '4px',
                    outline: 'none',
                    boxShadow: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = 'none';
                    e.target.style.border = '2px solidrgb(243, 250, 243)';
                  }}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  autoFocus
                />
                <style>
                  {`
                    .form-control:focus {
                      border-color:rgb(255, 255, 255) !important;
                      box-shadow: none !important;
                    }
                  `}
                </style>
              </>
            )}
          </div>
          <div className="d-flex justify-content-between">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
            >
              {currentInputIndex < inputs.length - 1 ? 'Next' : 'Run Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InputModal;