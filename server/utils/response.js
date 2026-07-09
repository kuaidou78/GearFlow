import { serialize } from './serialize.js';

export function sendData(res, data, meta) {
  const body = { data: serialize(data) };
  if (meta) body.meta = serialize(meta);
  return res.json(body);
}

export function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
