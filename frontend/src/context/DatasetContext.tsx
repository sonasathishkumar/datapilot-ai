import React, { createContext, useContext, useState } from 'react';

export interface DatasetInfo {
  sessionId: string;
  fileName: string;
  rows: number;
  columns: number;
}

interface DatasetContextType {
  dataset: DatasetInfo | null;
  setDataset: (info: DatasetInfo | null) => void;
}

export const DatasetContext = createContext<DatasetContextType>({
  dataset: null,
  setDataset: () => {},
});

export const useDataset = () => useContext(DatasetContext);

export const DatasetProvider = ({ children }: { children: React.ReactNode }) => {
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  return (
    <DatasetContext.Provider value={{ dataset, setDataset }}>
      {children}
    </DatasetContext.Provider>
  );
};
