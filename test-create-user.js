const axios = require('axios');

async function test() {
  try {
    console.log("Logging in...");
    const loginRes = await axios.post('http://localhost:8081/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginRes.data.accessToken;
    console.log("Got token:", token.substring(0, 20) + "...");
    
    console.log("Creating user...");
    const createRes = await axios.post('http://localhost:8081/api/v1/users', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword',
      nombre: 'Test',
      apellidos: 'User',
      activo: true,
      roleIds: [2]
    }, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    console.log("Success!", createRes.status);
  } catch (error) {
    if (error.response) {
      console.error("Failed with status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

test();
