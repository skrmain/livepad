import React from 'react';

const TextArea = ({ handleChange, value, themeColor, fontSize }) => {
    return (
        <div className="editor-pane">
            <textarea
                name="data"
                id="dataContainer"
                style={{ fontSize: `${fontSize}px`, ...themeColor }}
                // cols={30}
                // rows={10}
                value={value}
                onChange={handleChange}
                placeholder="Type here"
            />
        </div>
    );
};

export default TextArea;
