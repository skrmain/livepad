import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import './App.css';
import { config, defaultDataValue, defaultSettings, themeColor } from './constants';

import NavBar from './components/NavBar';
import TextArea from './components/TextArea';
import ModalWrapper from './components/ModalWrapper';

import ConnectingImg from './components/Connecting';
import RoomInfo from './components/RoomInfo';
import Settings from './components/Settings';

const SettingsModal = ModalWrapper(Settings);
const ConnectingModal = ModalWrapper(ConnectingImg);
const RoomInfoModal = ModalWrapper(RoomInfo);

const App = () => {
    const [data, setData] = useState(defaultDataValue);
    const [roomId, setRoomId] = useState('');
    const [usersCount, setUsersCount] = useState(0);
    const [socket, setSocket] = useState();
    const [settings, setSettings] = useState(defaultSettings);
    const [currentModal, setCurrentModal] = useState('Connecting');

    const setSettingsFromLocalStorage = () => {
        const _settings = JSON.parse(localStorage.getItem('settings') || JSON.stringify(defaultSettings));

        setSettings(_settings);
    };

    const handleChange = event => {
        const { value } = event.target;

        setData(prev => {
            const _prev = { ...prev };
            _prev.value = value;
            _prev.lastUpdate = new Date().getTime();
            if (socket) socket.emit('updateText', { ..._prev });
            return _prev;
        });
    };

    const cutAllText = () => {
        copyAllText();
        setData(prev => {
            const _prev = { ...prev };
            _prev.value = '';
            _prev.lastUpdate = new Date().getTime();
            if (socket) socket.emit('updateText', _prev);
            return _prev;
        });
    };

    const handleRoomJoin = roomId => {
        if (roomId) {
            if (socket) socket.emit('join', roomId);
            closeModal();
        }
    };

    const copyAllText = () => navigator.clipboard.writeText(data.value);

    const closeModal = () => setCurrentModal('');

    const handleResponse = response => {
        if (response.status && response.data) {
            const responseData = response.data;
            console.log('R ', responseData);
            const { usersCount: _usersCount, roomId: _roomId, lastUpdate: _lastUpdate, value: _value } = responseData;
            if (_roomId && _roomId !== roomId) {
                setRoomId(responseData.roomId);
            }
            if (_usersCount && _usersCount !== usersCount) {
                setUsersCount(responseData.usersCount);
            }
            if (data.lastUpdate !== _lastUpdate) {
                setData(prev => {
                    const _prev = { ...prev };
                    _prev.value = _value || '';
                    _prev.lastUpdate = _lastUpdate || 0;

                    return _prev;
                });
            }
        }
    };

    useEffect(() => {
        setSettingsFromLocalStorage();

        const _socket = io(config.BASE_URL);
        setSocket(_socket);
        _socket.on('response', handleResponse);
        _socket.on('connect', () => setCurrentModal(''));
        _socket.on('disconnect', () => setCurrentModal('Connecting'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            />
            {currentModal === 'Connecting' && <ConnectingModal />}
            {currentModal === '' && (
                <TextArea value={data.value} handleChange={handleChange} fontSize={settings.fontSize} themeColor={themeColor[settings.theme]} />
            )}
            {currentModal === 'RoomInfo' && <RoomInfoModal handleRoomJoin={handleRoomJoin} closeModal={closeModal} roomId={roomId} />}
            {currentModal === 'Settings' && <SettingsModal closeModal={closeModal} settings={settings} setSettings={setSettings} />}
        </div>
    );
};

export default App;
