'use strict';
/* global describe, it */
var assert = require('assert');
var src = require('../lib/index');
var Rx = require('rx');
var makeHTTPDriver = src.makeHTTPDriver;

function run(uri) {
  describe('makeHTTPDriver', function () {
    it('should be a driver factory', function () {
      assert.strictEqual(typeof makeHTTPDriver, 'function');
      var output = makeHTTPDriver();
      assert.strictEqual(typeof output, 'function');
    });
  });

  describe('HTTP Driver', function () {
    it('should throw when request stream emits neither string nor object',
      function(done) {
        var request$ = Rx.Observable.just(123);
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.mergeAll().subscribe(
          function onNext() { assert.fail(); },
          function onError(err) {
            assert.strictEqual(err.message, 'Observable of requests given to ' +
              'HTTP Driver must emit either URL strings or objects with ' +
              'parameters.'
            );
            done();
          }
        );
      }
    );

    it('should throw when given options object without url string',
      function(done) {
        var request$ = Rx.Observable.just({method: 'post'});
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.mergeAll().subscribe(
          function onNext() { assert.fail(); },
          function onError(err) {
            assert.strictEqual(
              err.message, 'Please provide a `url` property in the request ' +
              'options.'
            );
            done();
          }
        );
      }
    );

    it('should return response metastream when given a simple URL string',
      function(done) {
        var request$ = Rx.Observable.just(uri + '/hello');
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.subscribe(function(response$) {
          assert.strictEqual(typeof response$.request, 'object');
          assert.strictEqual(response$.request.url, uri + '/hello');
          response$.subscribe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.text, 'Hello World');
            done();
          });
        });
      }
    );

    it('should return response metastream with isolateSource and isolateSink',
      function(done) {
        var request$ = Rx.Observable.just(uri + '/hello');
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        assert.strictEqual(typeof response$$.isolateSource, 'function');
        assert.strictEqual(typeof response$$.isolateSink, 'function');
        done();
      }
    );

    it('should return response metastream when given simple options obj',
      function(done) {
        var request$ = Rx.Observable.just({
          url: uri + '/pet',
          method: 'POST',
          send: {name: 'Woof', species: 'Dog'}
        });
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.subscribe(function(response$) {
          assert.strictEqual(response$.request.url, uri + '/pet');
          assert.strictEqual(response$.request.method, 'POST');
          assert.strictEqual(response$.request.send.name, 'Woof');
          assert.strictEqual(response$.request.send.species, 'Dog');
          response$.subscribe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.text, 'added Woof the Dog');
            done();
          });
        });
      }
    );

    it('should return response metastream when given another options obj',
      function(done) {
        var request$ = Rx.Observable.just({
          url: uri + '/querystring',
          method: 'GET',
          query: {foo: 102030, bar: 'Pub'}
        });
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.subscribe(function(response$) {
          assert.strictEqual(response$.request.url, uri + '/querystring');
          assert.strictEqual(response$.request.method, 'GET');
          assert.strictEqual(response$.request.query.foo, 102030);
          assert.strictEqual(response$.request.query.bar, 'Pub');
          response$.subscribe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.foo, '102030');
            assert.strictEqual(response.body.bar, 'Pub');
            done();
          });
        });
      }
    );

    it('should return response metastream when given yet another options obj',
      function(done) {
        var request$ = Rx.Observable.just({
          url: uri + '/delete',
          method: 'DELETE',
          query: {foo: 102030, bar: 'Pub'}
        });
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.subscribe(function(response$) {
          assert.strictEqual(response$.request.url, uri + '/delete');
          assert.strictEqual(response$.request.method, 'DELETE');
          response$.subscribe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.deleted, true);
            done();
          });
        });
      }
    );

    it('should not be possible to change the metastream\'s request',
      function () {
        var request$ = Rx.Observable.just({
          url: uri + '/hello',
          method: 'GET'
        });
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        assert.throws(
          function () {
            response$$
              .map(function (response$) {
                response$.request = 1234;
                return response$;
              })
              .subscribe(function(response$) {
                assert.strictEqual(response$.request.url, uri + '/hello');
                assert.strictEqual(response$.request.method, 'GET');
              });
          },
          TypeError
        )
      }
    )

    it('should send 500 server errors to response$ onError',
      function(done) {
        var request$ = Rx.Observable.just(uri + '/error');
        var httpDriver = makeHTTPDriver();
        var response$$ = httpDriver(request$);
        response$$.subscribe(function(response$) {
          assert.strictEqual(typeof response$.request, 'object');
          assert.strictEqual(response$.request.url, uri + '/error');
          response$.subscribe(
            function onNext() { assert.fail(); },
            function onError(err) {
              assert.strictEqual(err.status, 500);
              assert.strictEqual(err.message, 'Internal Server Error');
              assert.strictEqual(err.response.text, 'boom');
              done();
            }
          );
        });
      }
    );

  });

  describe('isolateSource and isolateSink', function () {
    it('should exist on the HTTP Source (response$$)', function(done) {
      var httpDriver = makeHTTPDriver();
      var request$ = new Rx.Subject();
      var response$$ = httpDriver(request$);

      assert.strictEqual(typeof response$$.isolateSource, 'function');
      assert.strictEqual(typeof response$$.isolateSink, 'function');
      done();
    });

    it('should exist on a scoped HTTP Source (response$$)', function(done) {
      var httpDriver = makeHTTPDriver();
      var request$ = new Rx.Subject();
      var response$$ = httpDriver(request$);

      var scopedRequest$ = response$$.isolateSink(request$, 'foo');
      var scopedResponse$$ = response$$.isolateSource(response$$, 'foo');

      assert.strictEqual(typeof scopedResponse$$.isolateSource, 'function');
      assert.strictEqual(typeof scopedResponse$$.isolateSink, 'function');
      done();
    });

    it('should hide responses from outside the scope',
      function(done) {
        var httpDriver = makeHTTPDriver();
        var proxyRequest$ = new Rx.Subject();
        var response$$ = httpDriver(proxyRequest$);

        var ignoredRequest$ = Rx.Observable.just(uri + '/json');
        var request$ = Rx.Observable.just(uri + '/hello').delay(10);
        var scopedRequest$ = response$$.isolateSink(request$, 'foo');
        var scopedResponse$$ = response$$.isolateSource(response$$, 'foo');

        scopedResponse$$.subscribe(function(response$) {
          assert.strictEqual(typeof response$.request, 'object');
          assert.strictEqual(response$.request.url, uri + '/hello');
          response$.subscribe(function(response) {
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.text, 'Hello World');
            done();
          });
        });

        Rx.Observable.merge(ignoredRequest$, scopedRequest$)
          .subscribe(proxyRequest$.asObserver());
      }
    );
  });
}

module.exports = run;
