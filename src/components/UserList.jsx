import React from "react";
import { useSocket } from "../contexts/SocketContext";

const UserList = () => {
  const { presenceUsers } = useSocket();

  return (
    <div className="user-list">
      <h3 className="user-list-header">
        Online Users - {presenceUsers.length}
      </h3>
      <div className="user-list-container">
        {presenceUsers.length > 0 ? (
          <ul>
            {presenceUsers.map((user) => (
              <li key={user.userId} className="user-item">
                <div className="user-status-indicator online"></div>
                <span className="user-name">{user.username}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-users">No users online</p>
        )}
      </div>
    </div>
  );
};

export default UserList;
