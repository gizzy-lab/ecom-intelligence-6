import { createContext, useContext, useState, useCallback } from "react";

const DataContext = createContext(null);

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [session, setSession] = useState(null); // { dataset_id, filename, row_count, mapping, is_demo }
  const [overview, setOverview] = useState(null);
  const [insights, setInsights] = useState(null);
  const [messages, setMessages] = useState([]);

  const startSession = useCallback((meta) => {
    setSession(meta);
    setOverview(null);
    setInsights(null);
    setMessages([]);
  }, []);

  const reset = useCallback(() => {
    setSession(null);
    setOverview(null);
    setInsights(null);
    setMessages([]);
  }, []);

  return (
    <DataContext.Provider
      value={{
        session,
        overview,
        setOverview,
        insights,
        setInsights,
        messages,
        setMessages,
        startSession,
        reset,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
