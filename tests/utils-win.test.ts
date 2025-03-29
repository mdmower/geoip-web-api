import {expandTildePath} from '../src/utils.js';

vitest.mock(import('node:os'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    homedir: () => 'C:\\Users\\someuser',
  };
});

vitest.mock(import('node:path'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sep: '\\' as const,
  };
});

describe('Ignore ~ on Windows', () => {
  afterAll(() => {
    vitest.restoreAllMocks();
  });

  it('does not expand ~', () => {
    expect(expandTildePath('~')).toEqual('~');
  });

  it('does not expand ~/tmp/dir', () => {
    expect(expandTildePath('~/tmp/dir')).toEqual('~/tmp/dir');
  });
});
