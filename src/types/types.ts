// Query 
export interface QueryItem {
  id: string;
  title: string;
  query: string;
  hos_use: string;
  query_type: string;
  create_by: string;
  create_at: string;
}

// User
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

// QueryList
export interface QueryList {
  queryList: QueryItem[] | [];
  isError: boolean;
  isLoading: boolean;
  loadQuery: () => Promise<void>;
  addQuery: () => void;
  editQuery: (id: string) => void;
}