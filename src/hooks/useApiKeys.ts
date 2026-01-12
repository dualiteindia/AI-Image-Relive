import { useState, useEffect } from 'react';

export const useApiKeys = () => {
  const [keys, setKeys] = useState({
    apiKey: '',
    apiSecret: ''
  });

  useEffect(() => {
    // 1. Check Environment Variables
    const envKey = import.meta.env.VITE_HIGGSFIELD_API_KEY;
    const envSecret = import.meta.env.VITE_HIGGSFIELD_API_SECRET;

    // Check if they are valid (not placeholders)
    const hasEnvKeys = envKey && envKey !== "YOUR_API_KEY" && envSecret && envSecret !== "YOUR_API_SECRET";

    if (hasEnvKeys) {
      setKeys({ apiKey: envKey, apiSecret: envSecret });
    }
    // We intentionally do NOT check localStorage here anymore.
    // Keys will reset on every page reload.
  }, []);

  const saveKeys = (newKey: string, newSecret: string) => {
    // We update the state for the current session only.
    // We do NOT save to localStorage.
    setKeys({ apiKey: newKey, apiSecret: newSecret });
  };

  const hasKeys = Boolean(keys.apiKey && keys.apiSecret);

  return { ...keys, saveKeys, hasKeys };
};
