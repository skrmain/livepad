import React from 'react';

import Cut from './../images/Cut.png';
import Copy from './../images/Copy.png';
import People from '../images/People.png';
import Settings from '../images/Settings.png';
import GitHub from '../images/GitHub.png';

const NavBar = ({
    usersCount,
    openRoomInfo,
    openSettings,
    copyAllText,
    cutAllText,
    roomId,
    isConnected,
    toggleConnection,
    supportsFilePicker,
    openFile,
    fileName,
    fileError
}) => {
    return (
        <nav className="navbar navbar-light my-navbar">
            <span className="navbar-brand" style={{ fontSize: '1.5rem', color: 'white' }}>
                {document.title}
            </span>
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`} role="status">
                <span className="connection-indicator" aria-hidden="true" />
                {isConnected ? 'Connected' : 'Offline'}
            </span>
            <a href="https://github.com/skrmain/LiveNotepad" target="_blank" title="GitHub" rel="noopener noreferrer">
                <img src={GitHub} alt="GitHub" />
            </a>
            <div className="nav-action-container">
                <button onClick={cutAllText} title="Cut all text">
                    <img src={Cut} alt="Cut" style={{ width: '25px', height: '25px' }} />
                </button>
                <button onClick={copyAllText} title="Copy all text">
                    <img src={Copy} alt="Copy" style={{ width: '25px', height: '25px' }} />
                </button>
                {supportsFilePicker && (
                    <>
                        <button onClick={openFile} title="Open local text file">Open file</button>
                        <span className="file-name" title={fileName}>{fileName}</span>
                    </>
                )}
                {fileError && <span className="file-error" role="alert">{fileError}</span>}
                {isConnected && (
                    <button onClick={openRoomInfo} title="People">
                        <img src={People} alt="People" />
                        <span className="usersCount">{usersCount}</span>({roomId})
                    </button>
                )}
                <button onClick={openSettings} title="settings">
                    <img src={Settings} alt="Settings" />
                </button>
                <button onClick={toggleConnection} title={isConnected ? 'Disconnect from server' : 'Connect to server'}>
                    {isConnected ? 'Disconnect' : 'Connect'}
                </button>
            </div>
        </nav>
    );
};

export default NavBar;
