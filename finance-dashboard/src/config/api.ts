const getApiBaseUrl = (): string => {
  if (process.env.NODE_ENV === 'development') {
    const host = process.env.REACT_APP_API_HOST || 'localhost';
    const port = process.env.REACT_APP_API_PORT || '8000';
    return `http://${host}:${port}`;
  }
  return ''; // Production uses relative URLs
};

export { getApiBaseUrl };