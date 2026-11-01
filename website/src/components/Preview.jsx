import React from 'react';

import { getPreviewDocument } from '../utils/preview';

const Preview = ({ type, value }) => (
    <section className="preview-pane">
        <iframe
            title={`${type === 'markdown' ? 'Markdown' : 'HTML'} preview`}
            sandbox=""
            srcDoc={getPreviewDocument(type, value)}
        />
    </section>
);

export default Preview;
