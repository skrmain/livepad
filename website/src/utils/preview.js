const previewTypes = {
    html: {
        fileExtensions: ['.html', '.htm'],
        matchesContent: value => /<\s*(?:!doctype\s+html\b|\/?[a-z][\w:-]*(?:\s[^<>]*?)?\/?)\s*>/i.test(value),
        toHtml: value => value
    },
    markdown: {
        fileExtensions: ['.md', '.markdown'],
        matchesContent: value => /(^|\n)\s{0,3}(?:#{1,6}\s|```|[-*+]\s|\d+\.\s|>\s|(?:-{3,}|_{3,}|\*{3,})\s*(?:\n|$))|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|(?:\*[^*\n]+\*|_[^_\n]+_)/m.test(value),
        toHtml: markdownToHtml
    }
};

function escapeHtml(value) {
    return value.replace(/[&<>"'\u0000]/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '\u0000': '&#xfffd;'
    })[character]);
}

function markdownInline(value) {
    const tokens = [];
    const preserve = html => {
        const token = `\u0000${tokens.length}\u0000`;
        tokens.push(html);
        return token;
    };

    let result = escapeHtml(value);
    result = result.replace(/`([^`]+)`/g, (_, code) => preserve(`<code>${code}</code>`));
    result = result.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, destination) => {
        const scheme = destination.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
        if (scheme && !['http', 'https', 'mailto'].includes(scheme)) return label;
        return preserve(`<a href="${destination}">${label}</a>`);
    });
    result = result
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');

    return result.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[index]);
}

function markdownToHtml(value) {
    const lines = value.split(/\r?\n/);
    const output = [];
    let paragraph = [];
    let listType = '';
    let listItems = [];
    let codeLines = null;

    const flushParagraph = () => {
        if (paragraph.length) output.push(`<p>${paragraph.map(markdownInline).join('<br>')}</p>`);
        paragraph = [];
    };
    const flushList = () => {
        if (listItems.length) {
            output.push(`<${listType}>${listItems.map(item => `<li>${markdownInline(item)}</li>`).join('')}</${listType}>`);
        }
        listType = '';
        listItems = [];
    };

    lines.forEach(line => {
        if (codeLines) {
            if (/^\s*```/.test(line)) {
                output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
                codeLines = null;
            } else {
                codeLines.push(line);
            }
            return;
        }
        if (/^\s*```/.test(line)) {
            flushParagraph();
            flushList();
            codeLines = [];
            return;
        }
        if (!line.trim()) {
            flushParagraph();
            flushList();
            return;
        }

        const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
        const unorderedItem = line.match(/^\s*[-*+]\s+(.+)$/);
        const orderedItem = line.match(/^\s*\d+\.\s+(.+)$/);
        if (heading) {
            flushParagraph();
            flushList();
            const level = heading[1].length;
            output.push(`<h${level}>${markdownInline(heading[2])}</h${level}>`);
        } else if (unorderedItem || orderedItem) {
            flushParagraph();
            const nextListType = unorderedItem ? 'ul' : 'ol';
            if (listType && listType !== nextListType) flushList();
            listType = nextListType;
            listItems.push((unorderedItem || orderedItem)[1]);
        } else if (/^\s{0,3}>\s?/.test(line)) {
            flushParagraph();
            flushList();
            output.push(`<blockquote>${markdownInline(line.replace(/^\s{0,3}>\s?/, ''))}</blockquote>`);
        } else if (/^\s{0,3}(?:---+|\*\*\*+)\s*$/.test(line)) {
            flushParagraph();
            flushList();
            output.push('<hr>');
        } else {
            flushList();
            paragraph.push(line);
        }
    });

    flushParagraph();
    flushList();
    if (codeLines) output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    return output.join('\n');
}

export const getPreviewType = (value, fileName = '') => {
    const extension = fileName.match(/\.[^.]+$/)?.[0]?.toLowerCase();
    const fileType = Object.entries(previewTypes).find(([, type]) => type.fileExtensions.includes(extension));
    if (fileType) return fileType[0];

    return Object.entries(previewTypes).find(([, type]) => type.matchesContent(value))?.[0] || '';
};

export const getPreviewDocument = (type, value) => {
    const renderer = previewTypes[type];
    if (!renderer) return '';

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;line-height:1.5;margin:1rem}pre{overflow:auto}img{max-width:100%}blockquote{border-left:3px solid #888;margin-left:0;padding-left:1rem}</style>
</head>
<body>${renderer.toHtml(value)}</body>
</html>`;
};
