const Rx = require(`@reactivex/rxjs`)
const superagent = require(`superagent`)

function optionsToSuperagent({
  url,
  send = null,
  accept = null,
  query = null,
  user = null,
  password = null,
  field = null,
  attach = null, // if valid, should be an array
  withCredentials = false,
  headers = {},
  redirects = 5,
  type = `json`,
  method = `get`,
}) {
  if (typeof url !== `string`) {
    throw new Error(`Please provide a \`url\` property in the request options.`)
  }
  const sanitizedMethod = method.toLowerCase()
  let request = superagent[sanitizedMethod](url)
  if (typeof request.redirects === `function`) {
    request = request.redirects(redirects)
  }
  request = request.type(type)
  if (send !== null) {
    request = request.send(send)
  }
  if (accept !== null) {
    request = request.accept(accept)
  }
  if (query !== null) {
    request = request.query(query)
  }
  if (withCredentials) {
    request = request.withCredentials()
  }
  if (user !== null && password !== null) {
    request = request.auth(user, password)
  }
  for (let key in headers) {
    if (headers.hasOwnProperty(key)) {
      request = request.set(key, headers[key])
    }
  }
  if (field !== null) {
    for (let key in field) {
      if (field.hasOwnProperty(key)) {
        request = request.field(key, field[key])
      }
    }
  }
  if (attach !== null) {
    for (let i = attach.length - 1; i >= 0; i--) {
      const a = attach[i]
      request = request.attach(a.name, a.path, a.filename)
    }
  }
  return request
}

function urlToSuperagent(url) {
  return superagent.get(url)
}

function createResponse$(reqOptions) {
  return Rx.Observable.create(observer => {
    let request
    if (typeof reqOptions === `string`) {
      request = urlToSuperagent(reqOptions)
    } else if (typeof reqOptions === `object`) {
      try {
        request = optionsToSuperagent(reqOptions)
      } catch (err) {
        observer.error(err)
        return () => {} // noop
      }
    } else {
      observer.error(new Error(`Observable of requests given to HTTP ` +
        `Driver must emit either URL strings or objects with parameters.`))
      return () => {} // noop
    }

    try {
      request.end((err, res) => {
        if (err) {
          observer.error(err)
        } else {
          observer.next(res)
          observer.complete()
        }
      })
    } catch (err) {
      observer.error(err)
    }

    return function onDispose() {
      request.abort()
    }
  })
}

function makeHTTPDriver({eager = false} = {eager: false}) {
  return function httpDriver(request$) {
    let response$$ = request$
      .map(reqOptions => {
        let response$ = createResponse$(reqOptions)
        if (eager || reqOptions.eager) {
          response$ = response$.publishReplay(null, 1).connect()
          return response$
        }
        response$.request = reqOptions
        return response$
      }).shareReplay(null, 1)
    return response$$
  }
}

module.exports = {
  optionsToSuperagent,
  urlToSuperagent,
  createResponse$,

  makeHTTPDriver,
}
