import React, { useState, useEffect } from 'react';

function InputModal({ isOpen, onClose, onSubmit, code, language }) {
  const [inputs, setInputs] = useState([]);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      // Parse the code to find input variables based on language
      const foundInputs = parseCodeForInputs(code, language);
      setInputs(foundInputs);
      setCurrentInputIndex(0);
      setCurrentValue('');
    }
  }, [isOpen, code, language]);

  const parseCodeForInputs = (code, language) => {
    let inputMatches = [];
    
    switch (language) {
      case 'python3':
        // Match input() statements with variable names
        const pythonRegex = /(\w+)\s*=\s*input\s*\([^)]*\)/g;
        let match;
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
        break;
        
      // Add cases for other languages as needed
    }
    
    return inputMatches;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (currentInputIndex < inputs.length - 1) {
      // More inputs to collect
      inputs[currentInputIndex].value = currentValue;
      setCurrentInputIndex(prev => prev + 1);
      setCurrentValue('');
    } else {
      // Last input - submit all collected inputs
      const finalInputs = [
        ...inputs.slice(0, currentInputIndex),
        { ...inputs[currentInputIndex], value: currentValue }
      ];
      
      // Convert collected inputs to proper format
      const formattedInput = finalInputs
        .map(input => input.value)
        .join('\n');
      
      // Submit the code and close the modal
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
                  className="form-control bg-dark text-light border-secondary"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  autoFocus
                />
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