export const generateUser = (prefix = 'user') => {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};
