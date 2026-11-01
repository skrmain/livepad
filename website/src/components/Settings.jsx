import React from 'react';

import Close from './../images/Close.png';

const Settings = ({ closeModal, setSettings, settings }) => {
    const handleChange = e => {
        const name = e.target.name;
        const value = e.target.value;

        let _settings = { ...settings };
        if (name === 'theme' || name === 'saveLocal') {
            _settings[name] = value;
        } else if (name === 'fontSize' && value >= 10 && value <= 24) {
            _settings[name] = value;
        } else {
            console.log('Invalid Setting');
        }
        setSettings(_settings);
        localStorage.setItem('settings', JSON.stringify(_settings));
    };

    return (
        <>
            <div className="close-btn">
                <button onClick={closeModal}>
                    <img src={Close} alt="Close" />
                </button>
            </div>
            <div className="my-modal-content">
                <h2>Settings</h2>
                <div className="settings-container">
                    <div>
                        <p>Theme</p>
                        <select name="theme" id="theme" value={settings.theme} onInput={handleChange}>
                            {/* <option value="default">Default</option> */}
                            <option value="system">System</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                    {/* <div>
              <p>Save locally</p>
              <input
                style={{ height: "1.5rem", width: "1.5rem" }}
                type="checkbox"
                name="saveLocal"
                id="saveLocal"
                onChange={handleChange}
                checked={settings.saveLocal}
              />
            </div> */}
                    <div>
                        <p>Font size</p>
                        <select name="fontSize" id="fontSize" value={settings.fontSize} onInput={handleChange}>
                            {[10, 14, 18, 22, 24].map(v => (
                                <option value={v} key={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Settings;
