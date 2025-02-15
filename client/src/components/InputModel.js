import React from 'react';

function InputModal({ isOpen, onClose, onSubmit, value, onChange }) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

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
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="programInput" className="form-label">
              Enter your input (use new lines for multiple inputs):
            </label>
            <textarea
              id="programInput"
              className="form-control bg-dark text-light border-secondary"
              value={value}
              onChange={onChange}
              rows="4"
              autoFocus
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
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
              Run Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InputModal;