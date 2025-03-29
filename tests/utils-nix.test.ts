import {homedir} from 'node:os';
import {expandTildePath} from '../src/utils.js';

vitest.mock(import('node:os'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    homedir: () => '/home/someuser',
  };
});

vitest.mock(import('node:path'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sep: '/' as const,
  };
});

describe('Expand ~ on *nix', () => {
  let home: string;

  beforeAll(() => {
    home = homedir();
  });

  afterAll(() => {
    vitest.restoreAllMocks();
  });

  it('expands ~ alone', () => {
    expect(expandTildePath('~')).toEqual(home);
  });

  it('expands ~/tmp/dir', () => {
    expect(expandTildePath('~/tmp/dir')).toEqual(`${home}/tmp/dir`);
  });

  it('expands ~/tmp dir/', () => {
    expect(expandTildePath('~/tmp dir/')).toEqual(`${home}/tmp dir/`);
  });

  it('expands ~someuser', () => {
    expect(expandTildePath('~someuser')).toEqual('/home/someuser');
  });

  it('expands ~someuser/tmp/dir', () => {
    expect(expandTildePath('~someuser/tmp/dir')).toEqual('/home/someuser/tmp/dir');
  });

  it('expands ~someuser/tmp dir/', () => {
    expect(expandTildePath('~someuser/tmp dir/')).toEqual('/home/someuser/tmp dir/');
  });

  it('does not expand /dir/~', () => {
    const path = '/dir/~';
    expect(expandTildePath(path)).toEqual('/dir/~');
  });

  it('does not expand ~#/dir', () => {
    expect(expandTildePath('~#/dir')).toEqual('~#/dir');
  });
});
