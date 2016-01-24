'use strict';

var uri = 'http://localhost:5000';
process.env.ZUUL_PORT = 5000;
require('./support/server');
require('./common')(uri);

// Node.js specific ============================================================
var assert = require('assert');
var Rx = require('rx');
var src = require('../lib/index');
var makeHTTPDriver = src.makeHTTPDriver;
var globalSandbox = require('./support/global');

describe('HTTP Driver in Node.js', function () {
  it('should auto-execute HTTP request when factory gets eager = true',
    function(done) {
      var request$ = Rx.Observable.just({
        url: uri + '/pet',
        method: 'POST',
        send: {name: 'Woof', species: 'Dog'}
      });
      var httpDriver = makeHTTPDriver({eager: true});
      globalSandbox.petPOSTResponse = null;
      httpDriver(request$);
      setTimeout(function () {
        assert.notStrictEqual(globalSandbox.petPOSTResponse, null);
        assert.strictEqual(globalSandbox.petPOSTResponse, 'added Woof the Dog');
        globalSandbox.petPOSTResponse = null;
        done();
      }, 100);
    }
  );

  it('should not auto-execute HTTP request by default',
    function(done) {
      var request$ = Rx.Observable.just({
        url: uri + '/pet',
        method: 'POST',
        send: {name: 'Woof', species: 'Dog'}
      });
      var httpDriver = makeHTTPDriver();
      globalSandbox.petPOSTResponse = null;
      httpDriver(request$);
      setTimeout(function () {
        assert.strictEqual(globalSandbox.petPOSTResponse, null);
        done();
      }, 100);
    }
  );

  it('should auto-execute HTTP request if the request has eager = true',
    function(done) {
      var request$ = Rx.Observable.just({
        url: uri + '/pet',
        method: 'POST',
        send: {name: 'Woof', species: 'Dog'},
        eager: true
      });
      var httpDriver = makeHTTPDriver();
      globalSandbox.petPOSTResponse = null;
      httpDriver(request$);
      setTimeout(function () {
        assert.notStrictEqual(globalSandbox.petPOSTResponse, null);
        assert.strictEqual(globalSandbox.petPOSTResponse, 'added Woof the Dog');
        globalSandbox.petPOSTResponse = null;
        done();
      }, 100);
    }
  );

  it('should not auto-execute HTTP request when factory gets eager = false',
    function(done) {
      var request$ = Rx.Observable.just({
        url: uri + '/pet',
        method: 'POST',
        send: {name: 'Woof', species: 'Dog'}
      });
      var httpDriver = makeHTTPDriver({eager: false});
      globalSandbox.petPOSTResponse = null;
      httpDriver(request$);
      setTimeout(function () {
        assert.strictEqual(globalSandbox.petPOSTResponse, null);
        done();
      }, 100);
    }
  );

  it('should prepend prefix to all http requests',
    function(done) {
      var request$ = Rx.Observable.just({
        url: '/pet',
        method: 'POST',
        send: {name: 'Woof', species: 'Dog'}
      });
      var httpDriver = makeHTTPDriver({eager: true, prefix: uri});
      globalSandbox.petPOSTResponse = null;
      httpDriver(request$);
      setTimeout(function () {
        assert.notStrictEqual(globalSandbox.petPOSTResponse, null);
        assert.strictEqual(globalSandbox.petPOSTResponse, 'added Woof the Dog');
        globalSandbox.petPOSTResponse = null;
        done();
      }, 100);
    }
  );

  it('should override driver prefix with request.prefix',
    function(done) {
      var request$ = Rx.Observable.just({
        prefix: uri,
        url: '/pet',
        method: 'POST',
        send: {name: 'Woof', species: 'Dog'}
      });
      var httpDriver = makeHTTPDriver({eager: true, prefix: 'dummy'});
      globalSandbox.petPOSTResponse = null;
      httpDriver(request$);
      setTimeout(function () {
        assert.notStrictEqual(globalSandbox.petPOSTResponse, null);
        assert.strictEqual(globalSandbox.petPOSTResponse, 'added Woof the Dog');
        globalSandbox.petPOSTResponse = null;
        done();
      }, 100);
    }
  );

  it('should not use prefix if request.url contains protocol',
    function(done) {
      var request$ = Rx.Observable.just({
        url: uri + '/pet',
        method: 'POST',
        send: {name: 'Woof', species: 'Dog'}
      });
      var httpDriver = makeHTTPDriver({eager: true, prefix: 'dummy'});
      globalSandbox.petPOSTResponse = null;
      httpDriver(request$);
      setTimeout(function () {
        assert.notStrictEqual(globalSandbox.petPOSTResponse, null);
        assert.strictEqual(globalSandbox.petPOSTResponse, 'added Woof the Dog');
        globalSandbox.petPOSTResponse = null;
        done();
      }, 100);
    }
  );
});
