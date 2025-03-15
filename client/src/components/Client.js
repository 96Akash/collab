import React from 'react';
import Avatar from 'react-avatar';
import { toast } from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

const Client = ({ username, role, isHost, currentUserRole, isCurrentUserHost, onRoleChange }) => {
  const location = useLocation();
  const isCurrentUser = username === location.state?.username;

  const getRoleText = () => {
    // Host badge takes precedence over admin badge
    if (isHost) return 'Host';
    // Non-host users show their actual role (Admin/Viewer)
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleColor = () => {
    // Host: Red to indicate highest privileges
    if (isHost) return '#ff4d4d';
    // Admin: Blue to indicate elevated privileges
    // Viewer: Gray to indicate basic access
    return role === 'admin' ? '#4d94ff' : '#808080';
  };

  const canChangeRole = () => {
    // Host can change roles of any non-host user
    if (isCurrentUserHost) return !isHost;
    
    // Non-host admins can promote/demote viewers only
    if (currentUserRole === 'admin' && !isCurrentUserHost) {
      // Can only change viewers, not other admins
      return !isHost && role === 'viewer';
    }
    
    // Viewers have no role change permissions
    return false;
  };

  const handleRoleClick = () => {
    if (!canChangeRole()) {
      if (isHost) {
        toast.error("Host's role cannot be changed");
      } else if (currentUserRole === 'viewer') {
        toast.error("Viewers cannot change roles");
      } else if (currentUserRole === 'admin' && role === 'admin') {
        toast.error("Only the host can change roles of admins");
      } else {
        toast.error("You don't have permission to change this role");
      }
      return;
    }

    // Toggle between admin and viewer for non-host users
    const newRole = role === 'admin' ? 'viewer' : 'admin';
    onRoleChange(newRole);
  };

  return (
    <div className="client">
      <div className="user-info">
        <Avatar name={username} size={50} round="14px" />
        <div className="user-details">
          <div className="username-container">
            <span className="username">{username}</span>
            {isCurrentUser && <span className="current-user-badge">You</span>}
          </div>
        </div>
      </div>
      <div
        className={`user-role ${canChangeRole() ? 'clickable' : ''}`}
        onClick={handleRoleClick}
        style={{
          backgroundColor: getRoleColor(),
          cursor: canChangeRole() ? 'pointer' : 'default',
          padding: '4px 8px',
          borderRadius: '4px',
          color: 'white',
          fontSize: '0.9em',
          transition: 'all 0.2s ease'
        }}
      >
        {getRoleText()}
      </div>
      <style jsx>{`
        .client {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 8px;
          background-color: #1d1e22;
          transition: all 0.2s ease;
        }

        .client:hover {
          background-color: #2d2e32;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .username-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .username {
          font-size: 1.1em;
          color: #fff;
        }

        .current-user-badge {
          font-size: 0.8em;
          color: #fff;
          background-color: #4CAF50;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
        }

        .user-role {
          font-weight: 500;
        }

        .user-role.clickable:hover {
          opacity: 0.8;
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default Client;