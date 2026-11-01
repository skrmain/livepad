import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import './App.css';
import { config, defaultDataValue, defaultSettings, themeColor } from './constants';

import NavBar from './components/NavBar';
import TextArea from './components/TextArea';
import Preview from './components/Preview';
import ModalWrapper from './components/ModalWrapper';
import { getPreviewType } from './utils/preview';

import RoomInfo from './components/RoomInfo';
import Settings from './components/Settings';

const SettingsModal = ModalWrapper(Settings);
const RoomInfoModal = ModalWrapper(RoomInfo);
const LOCAL_DATA_KEY = 'livepad-data';
const EDITABLE_FILE_EXTENSIONS = [
    '.txt', '.md', '.markdown', '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.htm', '.css', '.scss',
    '.xml', '.csv', '.yaml', '.yml', '.toml', '.py', '.java', '.c', '.h', '.cpp', '.go', '.rs', '.sh',
    '.sql', '.log', '.ini', '.conf'
];
const TEXT_FILE_MIME_TYPES = [
    'application/json', 'application/javascript', 'application/xml', 'application/yaml', 'application/x-yaml',
    'application/sql', 'application/toml', 'application/x-shellscript', 'application/x-python'
];

const getStoredRoomData = roomId => {
    try {
        const storedData = JSON.parse(localStorage.getItem(LOCAL_DATA_KEY) || '{}');
        const roomData = storedData[roomId];

        if (roomData && typeof roomData.value === 'string') {
            return { value: roomData.value, lastUpdate: Number(roomData.lastUpdate) || 0 };
        }
    } catch {
        return null;
    }

    return null;
};

const storeRoomData = (roomId, data) => {
    try {
        const storedData = JSON.parse(localStorage.getItem(LOCAL_DATA_KEY) || '{}');
        const roomData = storedData && typeof storedData === 'object' && !Array.isArray(storedData) ? storedData : {};

        roomData[roomId] = { value: data.value, lastUpdate: data.lastUpdate };
        localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(roomData));
    } catch {
        // Keep editing available if local storage is unavailable or full.
    }
};

const removeStoredRoomData = roomId => {
    try {
        const storedData = JSON.parse(localStorage.getItem(LOCAL_DATA_KEY) || '{}');
        if (storedData && typeof storedData === 'object' && !Array.isArray(storedData)) {
            delete storedData[roomId];
            localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(storedData));
        }
    } catch {
        // Keep editing available if local storage is unavailable or full.
    }
};

const createRoomId = () => `local-${window.crypto.randomUUID()}`;

const App = () => {
    const [data, setData] = useState(() => getStoredRoomData('default') || { ...defaultDataValue, lastUpdate: 0 });
    const [roomId, setRoomId] = useState('default');
    const [usersCount, setUsersCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [fileName, setFileName] = useState('');
    const [fileError, setFileError] = useState('');
    const [settings, setSettings] = useState(defaultSettings);
    const [systemTheme, setSystemTheme] = useState(() =>
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );
    const [currentModal, setCurrentModal] = useState('');
    const [previewVisible, setPreviewVisible] = useState(false);
    const [conflict, setConflict] = useState(null);
    const dataRef = useRef(data);
    const roomIdRef = useRef(roomId);
    const socketRef = useRef();
    const selectedFileRef = useRef(null);
    const fileWriteRef = useRef(Promise.resolve());
    const serverDataRef = useRef({});
    const awaitingServerResponseRef = useRef('default');
    const pendingConflictRef = useRef(null);
    const conflictDialogRef = useRef(null);

    dataRef.current = data;
    roomIdRef.current = roomId;

    const setSettingsFromLocalStorage = () => {
        const _settings = JSON.parse(localStorage.getItem('settings') || JSON.stringify(defaultSettings));

        setSettings(_settings);
    };

    const handleChange = event => {
        const { value } = event.target;
        const nextData = {
            ...dataRef.current,
            value,
            lastUpdate: Math.max(Date.now(), (Number(dataRef.current.lastUpdate) || 0) + 1)
        };

        dataRef.current = nextData;
        setData(nextData);
        if (selectedFileRef.current) {
            const fileHandle = selectedFileRef.current;
            fileWriteRef.current = fileWriteRef.current
                .then(async () => {
                    const writable = await fileHandle.createWritable();
                    await writable.write(value);
                    await writable.close();
                })
                .catch(() => {});
        } else {
            storeRoomData(roomIdRef.current, nextData);
        }
        if (socketRef.current?.connected && !pendingConflictRef.current) {
            socketRef.current.emit('updateText', nextData);
        }
    };

    const cutAllText = () => {
        copyAllText();
        handleChange({ target: { value: '' } });
    };

    const handleRoomJoin = newRoomId => {
        if (newRoomId) {
            const localData = getStoredRoomData(newRoomId) || { ...defaultDataValue, lastUpdate: 0 };

            roomIdRef.current = newRoomId;
            dataRef.current = localData;
            setRoomId(newRoomId);
            setData(localData);
            setUsersCount(0);
            awaitingServerResponseRef.current = newRoomId;
            if (socketRef.current?.connected) socketRef.current.emit('join', newRoomId);
            closeModal();
        }
    };

    const openFile = async () => {
        if (typeof window.showOpenFilePicker !== 'function') return;

        try {
            const [fileHandle] = await window.showOpenFilePicker({
                multiple: false,
                types: [{
                    description: 'Editable text files',
                    accept: { 'text/plain': EDITABLE_FILE_EXTENSIONS }
                }]
            });
            const extension = fileHandle.name.slice(fileHandle.name.lastIndexOf('.')).toLowerCase();
            if (!EDITABLE_FILE_EXTENSIONS.includes(extension)) {
                setFileError('Choose an editable text file.');
                return;
            }
            if (await fileHandle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                setFileError('Write permission is required to edit this file.');
                return;
            }

            const file = await fileHandle.getFile();
            if (
                file.type &&
                !file.type.startsWith('text/') &&
                file.type !== 'application/octet-stream' &&
                !TEXT_FILE_MIME_TYPES.includes(file.type)
            ) {
                setFileError('Choose an editable text file.');
                return;
            }
            const contents = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
            if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(contents)) {
                setFileError('Choose an editable text file.');
                return;
            }
            const nextData = { value: contents, lastUpdate: Date.now() };

            selectedFileRef.current = fileHandle;
            setFileName(fileHandle.name);
            setFileError('');
            removeStoredRoomData(roomIdRef.current);
            dataRef.current = nextData;
            setData(nextData);

            const serverData = serverDataRef.current[roomIdRef.current];
            if (isConnected && serverData) {
                if (nextData.value !== serverData.value && nextData.lastUpdate > 0 && serverData.lastUpdate > 0) {
                    pendingConflictRef.current = { roomId: roomIdRef.current, serverData };
                    setConflict({ roomId: roomIdRef.current, serverData });
                } else if (nextData.lastUpdate > serverData.lastUpdate) {
                    socketRef.current.emit('updateText', nextData);
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') setFileError('Unable to open this file.');
        }
    };

    const resolveConflict = keepCurrentRoom => {
        const currentConflict = pendingConflictRef.current;
        if (!currentConflict) return;

        pendingConflictRef.current = null;
        setConflict(null);
        const currentData = dataRef.current;
        const latestServerData = serverDataRef.current[currentConflict.roomId] || currentConflict.serverData;

        if (keepCurrentRoom) {
            const nextData = {
                ...currentData,
                lastUpdate: Math.max(Date.now(), currentData.lastUpdate + 1, latestServerData.lastUpdate + 1)
            };
            dataRef.current = nextData;
            setData(nextData);
            if (!selectedFileRef.current) storeRoomData(currentConflict.roomId, nextData);
            socketRef.current?.emit('updateText', nextData);
            return;
        }

        const newRoomId = createRoomId();
        roomIdRef.current = newRoomId;
        setRoomId(newRoomId);
        setUsersCount(0);
        awaitingServerResponseRef.current = newRoomId;
        if (!selectedFileRef.current) storeRoomData(newRoomId, currentData);
        socketRef.current?.emit('join', newRoomId);
    };

    const copyAllText = () => navigator.clipboard.writeText(data.value);

    const closeModal = () => setCurrentModal('');
    const previewType = getPreviewType(data.value, fileName);

    const handleResponse = response => {
        if (response.status && response.data) {
            const responseData = response.data;
            const responseRoomId = responseData.roomId || 'default';

            if (responseRoomId !== roomIdRef.current) return;
            if (typeof responseData.usersCount === 'number') setUsersCount(responseData.usersCount);

            const serverData = {
                value: responseData.value || '',
                lastUpdate: Number(responseData.lastUpdate) || 0
            };
            serverDataRef.current[responseRoomId] = serverData;
            const localData = dataRef.current;

            if (pendingConflictRef.current) return;
            if (awaitingServerResponseRef.current === responseRoomId) {
                awaitingServerResponseRef.current = null;
                if (localData.lastUpdate > 0 && serverData.lastUpdate > 0 && localData.value !== serverData.value) {
                    pendingConflictRef.current = { roomId: responseRoomId, serverData };
                    setConflict({ roomId: responseRoomId, serverData });
                    return;
                }
            }

            if (localData.lastUpdate > serverData.lastUpdate) {
                if (socketRef.current?.connected) socketRef.current.emit('updateText', localData);
            } else if (localData.lastUpdate !== serverData.lastUpdate || localData.value !== serverData.value) {
                dataRef.current = serverData;
                setData(serverData);
                if (selectedFileRef.current) {
                    const fileHandle = selectedFileRef.current;
                    fileWriteRef.current = fileWriteRef.current
                        .then(async () => {
                            const writable = await fileHandle.createWritable();
                            await writable.write(serverData.value);
                            await writable.close();
                        })
                        .catch(() => {});
                } else {
                    storeRoomData(responseRoomId, serverData);
                }
            }
        }
    };

    useEffect(() => {
        setSettingsFromLocalStorage();

        const _socket = io(config.BASE_URL);
        socketRef.current = _socket;
        _socket.on('response', handleResponse);
        _socket.on('connect', () => {
            setIsConnected(true);
            setUsersCount(0);
            awaitingServerResponseRef.current = roomIdRef.current;
            if (roomIdRef.current !== 'default') {
                _socket.emit('join', roomIdRef.current);
            }
        });
        _socket.on('disconnect', () => {
            setIsConnected(false);
            setUsersCount(0);
        });

        return () => _socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const dialog = conflictDialogRef.current;
        if (conflict && dialog && !dialog.open) dialog.showModal();
        if (!conflict && dialog?.open) dialog.close();
    }, [conflict]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const updateSystemTheme = event => setSystemTheme(event.matches ? 'dark' : 'light');

        mediaQuery.addEventListener('change', updateSystemTheme);
        return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    }, []);

    return (
        <div className="app-shell">
            <NavBar
                usersCount={usersCount}
                roomId={roomId}
                openRoomInfo={() => setCurrentModal('RoomInfo')}
                openSettings={() => setCurrentModal('Settings')}
                copyAllText={copyAllText}
                cutAllText={cutAllText}
                openFile={openFile}
                fileName={fileName}
                fileError={fileError}
                hasPreview={Boolean(previewType)}
                previewVisible={previewVisible}
                togglePreview={() => setPreviewVisible(visible => !visible)}
                supportsFilePicker={typeof window.showOpenFilePicker === 'function'}
                isConnected={isConnected}
                toggleConnection={() => socketRef.current?.connected ? socketRef.current.disconnect() : socketRef.current?.connect()}
            />
            {currentModal === '' && (
                <main className={`editor-layout${previewVisible && previewType ? ' preview-visible' : ''}`}>
                    <TextArea
                        value={data.value}
                        handleChange={handleChange}
                        fontSize={settings.fontSize}
                        themeColor={themeColor[settings.theme === 'system' ? systemTheme : settings.theme]}
                    />
                    {previewVisible && previewType && <Preview type={previewType} value={data.value} />}
                </main>
            )}
            {currentModal === 'RoomInfo' && <RoomInfoModal handleRoomJoin={handleRoomJoin} closeModal={closeModal} roomId={roomId} />}
            {currentModal === 'Settings' && <SettingsModal closeModal={closeModal} settings={settings} setSettings={setSettings} />}
            <dialog
                ref={conflictDialogRef}
                className="conflict-dialog"
                aria-labelledby="conflict-title"
                onCancel={event => event.preventDefault()}
            >
                <h2 id="conflict-title">Different content in this room</h2>
                <p>Replace the shared content with your current text, or keep it in a new room?</p>
                <div className="conflict-actions">
                    <button onClick={() => resolveConflict(true)}>Replace in this room</button>
                    <button onClick={() => resolveConflict(false)}>Keep in a new room</button>
                </div>
            </dialog>
        </div>
    );
};

export default App;
