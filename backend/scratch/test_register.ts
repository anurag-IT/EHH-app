import axios from 'axios';

async function testRegister() {
  try {
    const res = await axios.post('http://localhost:3001/api/users/register', {
      name: 'Test User',
      email: 'test' + Math.random() + '@example.com',
      password: 'password123'
    });
    console.log('Register Success:', res.data);
  } catch (err: any) {
    console.error('Register Failed:', err.response?.data || err.message);
  }
}

testRegister();
