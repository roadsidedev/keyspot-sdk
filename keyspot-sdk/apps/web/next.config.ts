import nextra from 'nextra';

const withNextra = nextra({
  contentDirBasePath: '/doc',
});

export default withNextra({
  // Allow the dashboard routes to work alongside the doc pages
  transpilePackages: ['@tanstack/react-query', 'recharts'],
});
