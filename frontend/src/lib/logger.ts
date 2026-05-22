export const logger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.debug('[homeai]', ...args);
  },
  error: (...args: unknown[]) => console.error('[homeai]', ...args),
};
