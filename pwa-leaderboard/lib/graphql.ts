import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL ||
  'https://api.studio.thegraph.com/query/YOUR_ID/agentbank-mantle/version/latest';

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: SUBGRAPH_URL,
    fetchOptions: { cache: 'no-store' },
  }),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          agents: { merge: false },
          operations: { merge: false },
          vaults: { merge: false },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

/** Helper to run a query server-side (for Next.js RSC) */
export async function querySubgraph<T>(query: any, variables?: Record<string, any>): Promise<T> {
  const { data } = await apolloClient.query<T>({
    query,
    variables,
    fetchPolicy: 'network-only',
  });
  return data;
}
