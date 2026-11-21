/**
 * Crea un usuario de prueba usando la API.
 * Requiere variables de entorno: nunca escribas credenciales en el código.
 *
 *   API_URL=http://localhost:8089/api/v1 \
 *   ADMIN_USERNAME=admin \
 *   ADMIN_PASSWORD=... \
 *   TEST_PASSWORD=... \
 *   node scripts/dev/create-test-user.mjs
 */
const API_URL = process.env.API_URL || 'http://localhost:8089/api/v1';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!ADMIN_PASSWORD || !TEST_PASSWORD) {
  console.error('Define ADMIN_PASSWORD y TEST_PASSWORD en el entorno.');
  process.exit(1);
}

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${body.message || response.statusText}`);
  }
  return body;
};

const main = async () => {
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });

  await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.accessToken}` },
    body: JSON.stringify({
      username: 'testuser',
      email: 'test@example.com',
      password: TEST_PASSWORD,
      nombre: 'Test',
      apellidos: 'User',
      activo: true,
      roleIds: [2],
    }),
  });

  console.log('Usuario de prueba creado.');
};

main().catch((error) => {
  console.error('No se pudo crear el usuario:', error.message);
  process.exit(1);
});
