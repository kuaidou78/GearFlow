import { sendData } from '../utils/response.js';

export function health(_req, res) {
  return sendData(res, {
    ok: true,
    timestamp: new Date().toISOString()
  });
}
