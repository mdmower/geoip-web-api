import {expandTildePath} from './utils';
import {homedir} from 'os';
import path from 'path';

jest.mock('os');
const homedirMock = homedir as jest.Mock;

// Redefine path.sep as a getter so that we can use jest.spyOn
const originalSep = path.sep;
Object.defineProperty(path, 'sep', {get: () => originalSep});

describe('Expand ~ on *nix', () => {
  beforeAll(() => {
    jest.spyOn(path, 'sep', 'get').mockReturnValue('/');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('expands ~ alone', () => {
    const home = '/home/someuser';
    homedirMock.mockReturnValue(home);
    const path = '~';
    expect(expandTildePath(path)).toEqual(home);
  });

  it('expands ~/tmp/dir', () => {
    const home = '/home/someuser';
    homedirMock.mockReturnValue(home);
    const path = '~/tmp/dir';
    expect(expandTildePath(path)).toEqual(`${home}/tmp/dir`);
  });

  it('expands ~/tmp dir/', () => {
    const home = '/home/someuser';
    homedirMock.mockReturnValue(home);
    const path = '~/tmp dir/';
    expect(expandTildePath(path)).toEqual(`${home}/tmp dir/`);
  });

  it('expands ~someuser', () => {
    const path = '~someuser';
    expect(expandTildePath(path)).toEqual('/home/someuser');
  });

  it('expands ~someuser/tmp/dir', () => {
    const path = '~someuser/tmp/dir';
    expect(expandTildePath(path)).toEqual('/home/someuser/tmp/dir');
  });

  it('expands ~someuser/tmp dir/', () => {
    const path = '~someuser/tmp dir/';
    expect(expandTildePath(path)).toEqual('/home/someuser/tmp dir/');
  });

  it('does not expand /dir/~', () => {
    const path = '/dir/~';
    expect(expandTildePath(path)).toEqual('/dir/~');
  });

  it('does not expand ~#/dir', () => {
    const path = '~#/dir';
    expect(expandTildePath(path)).toEqual('~#/dir');
  });
});

describe('Ignore ~ on Windows', () => {
  beforeAll(() => {
    jest.spyOn(path, 'sep', 'get').mockReturnValue('\\');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('does not expand ~', () => {
    const home = 'C:\\Users\\someuser';
    homedirMock.mockReturnValue(home);
    const path = '~';
    expect(expandTildePath(path)).toEqual('~');
  });

  it('does not expand ~/tmp/dir', () => {
    const home = 'C:\\Users\\someuser';
    homedirMock.mockReturnValue(home);
    const path = '~/tmp/dir';
    expect(expandTildePath(path)).toEqual('~/tmp/dir');
  });
});
