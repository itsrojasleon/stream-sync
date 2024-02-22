import axios from 'axios';

const BASE_API_URL = 'https://jsonplaceholder.typicode.com/todos';

export const fetchTotalUsersCount = async () => {
  const { data } = await axios.get(`${BASE_API_URL}/count`);
  return data;
};

export const fetchUserById = async (userId: string) => {
  if (!userId) throw new Error(`userId must be defined and got ${userId}`);

  const { data } = await axios.get(`${BASE_API_URL}/${userId}`);
  return data;
};
