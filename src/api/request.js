import axios from 'axios';

const apiFn = (axiosConfig) => {
  return axios(axiosConfig);
};

export default apiFn;
