export const themeColor = {
    // default: {
    //     color: '#26262c',
    //     backgroundColor: '#eaeaea',
    // },
    light: {
        color: '#26262c',
        backgroundColor: '#eaeaea'
    },
    dark: {
        backgroundColor: '#26262c',
        color: '#eaeaea'
    }
};

export const defaultSettings = {
    theme: 'light',
    fontSize: 16
    // saveLocal: false,
};

export const defaultDataValue = {
    lastUpdate: new Date().getTime(),
    value: '',
    users: 0
};

const prod = {
    BASE_URL: import.meta.env.VITE_SERVER_URL || ''
};

const dev = {
    BASE_URL: 'http://localhost:8000'
};

export const config = import.meta.env.DEV ? dev : prod;
