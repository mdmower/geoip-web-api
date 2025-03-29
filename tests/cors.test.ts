import {GwaCors} from '../src/cors.js';
import {GwaLog, LogLevel} from '../src/log.js';

describe('CORS', () => {
  let gwaLog: GwaLog;
  beforeAll(() => {
    gwaLog = new GwaLog(LogLevel.OFF);
  });

  it('can return no header additions', () => {
    const gwaCors = new GwaCors(gwaLog, {});
    expect(gwaCors.getCorsHeaders('http://example.com')).toBeNull();
  });

  it('supports one string origin', () => {
    const exampleOrigins = ['http://example.com'];
    const gwaCors = new GwaCors(gwaLog, {origins: exampleOrigins});
    for (const origin of exampleOrigins) {
      expect(gwaCors.getCorsHeaders(origin)).toEqual({
        'Access-Control-Allow-Origin': origin,
      });
    }
  });

  it('supports multiple string origins', () => {
    const exampleOrigins = ['http://example.com', 'https://example.com'];
    const gwaCors = new GwaCors(gwaLog, {origins: exampleOrigins});
    for (const origin of exampleOrigins) {
      expect(gwaCors.getCorsHeaders(origin)).toEqual({
        'Access-Control-Allow-Origin': origin,
      });
    }
  });

  it('ignores invalid string origin', () => {
    const exampleOrigins = ['http://example.com', 'example.com'];
    const [exampleOrigin1, exampleOrigin2] = exampleOrigins;
    const gwaCors = new GwaCors(gwaLog, {origins: exampleOrigins});
    expect(gwaCors.getCorsHeaders(exampleOrigin1)).toEqual({
      'Access-Control-Allow-Origin': exampleOrigin1,
    });
    expect(gwaCors.getCorsHeaders(exampleOrigin2)).toBeNull();
  });

  it('supports string-type regex origins', () => {
    const exampleOriginStrRegex = 'https?://(?:\\w+\\.)?example\\.com|https?://localhost:5000';
    const exampleMatchingOrigins = [
      'http://example.com',
      'https://example.com',
      'https://abc.example.com',
      'http://localhost:5000',
    ];
    const exampleNonMatchingOrigins = ['http://a-b.example.com', 'http://localhost'];
    const gwaCors = new GwaCors(gwaLog, {originRegEx: exampleOriginStrRegex});
    for (const origin of exampleMatchingOrigins) {
      expect(gwaCors.getCorsHeaders(origin)).toEqual({
        'Access-Control-Allow-Origin': origin,
      });
    }
    for (const origin of exampleNonMatchingOrigins) {
      expect(gwaCors.getCorsHeaders(origin)).toBeNull();
    }
  });

  it('supports object-type regex origins', () => {
    const exampleOriginRegex = /https?:\/\/(?:\w+\.)?example\.com|https?:\/\/localhost:5000/;
    const exampleMatchingOrigins = [
      'http://example.com',
      'https://example.com',
      'https://abc.example.com',
      'http://localhost:5000',
    ];
    const exampleNonMatchingOrigins = ['http://a-b.example.com', 'http://localhost'];
    const gwaCors = new GwaCors(gwaLog, {originRegEx: exampleOriginRegex});
    for (const origin of exampleMatchingOrigins) {
      expect(gwaCors.getCorsHeaders(origin)).toEqual({
        'Access-Control-Allow-Origin': origin,
      });
    }
    for (const origin of exampleNonMatchingOrigins) {
      expect(gwaCors.getCorsHeaders(origin)).toBeNull();
    }
  });

  it('supports string-type and object-type regex origins', () => {
    const examleOriginStrings = ['http://a-b.example.com', 'http://localhost'];
    const exampleOriginRegex = /https?:\/\/(?:\w+\.)?example\.com|https?:\/\/localhost:5000/;
    const exampleMatchingOrigins = [
      'http://a-b.example.com',
      'http://localhost',
      'http://example.com',
      'https://example.com',
      'https://abc.example.com',
      'http://localhost:5000',
    ];
    const gwaCors = new GwaCors(gwaLog, {
      origins: examleOriginStrings,
      originRegEx: exampleOriginRegex,
    });
    for (const origin of exampleMatchingOrigins) {
      expect(gwaCors.getCorsHeaders(origin)).toEqual({
        'Access-Control-Allow-Origin': origin,
      });
    }
  });
});
