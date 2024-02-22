import { fetchUserById } from '@/api/reports';

const Home = async () => {
  const x = await fetchUserById('1');

  return <div>hello</div>;
};

export default Home;
