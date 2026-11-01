import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import './App.css';
import { config, defaultDataValue, defaultSettings, themeColor } from './constants';

import NavBar from './components/NavBar';
import TextArea from './components/TextArea';
import ModalWrapper from './components/ModalWrapper';

import RoomInfo from './components/RoomInfo';
import Settings from './components/Settings';

const SettingsModal = ModalWrapper(Settings);
const RoomInfoModal = ModalWrapper(RoomInfo);
const LOCAL_DATA_KEY = 'livepad-data';

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

const App = () => {
    const [data, setData] = useState(() => getStoredRoomData('default') || { ...defaultDataValue, lastUpdate: 0 });
    const [roomId, setRoomId] = useState('default');
    const [usersCount, setUsersCount] = useState(0);
    const [socket, setSocket] = useState();
    const [isConnected, setIsConnected] = useState(false);
    const [settings, setSettings] = useState(defaultSettings);
    const [systemTheme, setSystemTheme] = useState(() =>
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );
    const [currentModal, setCurrentModal] = useState('');
    const dataRef = useRef(data);
    const roomIdRef = useRef(roomId);
    const socketRef = useRef();

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
        storeRoomData(roomIdRef.current, nextData);
        if (socket?.connected) socket.emit('updateText', nextData);
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
            if (socket?.connected) socket.emit('join', newRoomId);
            closeModal();
        }
    };

    const copyAllText = () => navigator.clipboard.writeText(data.value);

    const closeModal = () => setCurrentModal('');

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
            const localData = dataRef.current;

            if (localData.lastUpdate > serverData.lastUpdate) {
                if (socketRef.current?.connected) socketRef.current.emit('updateText', localData);
            } else if (localData.lastUpdate !== serverData.lastUpdate || localData.value !== serverData.value) {
                dataRef.current = serverData;
                setData(serverData);
                storeRoomData(responseRoomId, serverData);
            }
        }
    };

    useEffect(() => {
        setSettingsFromLocalStorage();

        const _socket = io(config.BASE_URL);
        socketRef.current = _socket;
        setSocket(_socket);
        _socket.on('response', handleResponse);
        _socket.on('connect', () => {
            setIsConnected(true);
            if (roomIdRef.current !== 'default') {
                _socket.emit('join', roomIdRef.current);
            } else if (dataRef.current.lastUpdate > 0) {
                _socket.emit('updateText', dataRef.current);
            }
        });
        _socket.on('disconnect', () => setIsConnected(false));

        return () => _socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const updateSystemTheme = event => setSystemTheme(event.matches ? 'dark' : 'light');

        mediaQuery.addEventListener('change', updateSystemTheme);
        return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    }, []);

    return (
        <div style={{ height: '100vh' }}>
            <NavBar
                usersCount={usersCount}
                roomId={roomId}
                openRoomInfo={() => setCurrentModal('RoomInfo')}
                openSettings={() => setCurrentModal('Settings')}
                copyAllText={copyAllText}
                cutAllText={cutAllText}
                isConnected={isConnected}
            />
            {currentModal === '' && (
                <TextArea
                    value={data.value}
                    handleChange={handleChange}
                    fontSize={settings.fontSize}
                    themeColor={themeColor[settings.theme === 'system' ? systemTheme : settings.theme]}
                />
            )}
            {currentModal === 'RoomInfo' && <RoomInfoModal handleRoomJoin={handleRoomJoin} closeModal={closeModal} roomId={roomId} />}
            {currentModal === 'Settings' && <SettingsModal closeModal={closeModal} settings={settings} setSettings={setSettings} />}
        </div>
    );
};

export default App;
