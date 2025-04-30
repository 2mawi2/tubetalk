import { useEffect, useState } from 'react';

interface StorageUpdateEvent extends CustomEvent {
  detail: {
    key: string;
    value: any;
  };
}

export const useStorageListener = (key: string) => {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: StorageUpdateEvent) => {
      if (event.detail.key === key) {
        setValue(event.detail.value);
      }
    };

    window.addEventListener('tubetalk-storage-update', handler as EventListener);
    return () => window.removeEventListener('tubetalk-storage-update', handler as EventListener);
  }, [key]);

  return value;
}; 