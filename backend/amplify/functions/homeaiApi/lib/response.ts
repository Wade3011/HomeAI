export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
    },
    body: JSON.stringify(body),
  };
}

export function error(statusCode: number, code: string, message: string) {
  return json(statusCode, { error: code, message });
}
