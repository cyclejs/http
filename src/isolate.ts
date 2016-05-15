import {RequestOptions, RequestInput, ResponseStream} from './interfaces';
import {HTTPSource} from './HTTPSource';

export interface Mappable<T, R> {
  map(project: (x: T) => R): Mappable<R, any>;
}

export function isolateSource(httpSource: HTTPSource, scope: string): HTTPSource {
  return httpSource.filter((res$: ResponseStream) =>
    Array.isArray(res$.request._namespace) &&
    res$.request._namespace.indexOf(scope) !== -1
  );
}

export function isolateSink(request$: Mappable<RequestInput, RequestOptions>, scope: string): any {
  return request$.map((req: RequestInput) => {
    if (typeof req === `string`) {
      return {url: <string> req, _namespace: [scope]};
    }
    const reqOptions = <RequestOptions> req;
    reqOptions._namespace = reqOptions._namespace || [];
    reqOptions._namespace.push(scope);
    return reqOptions;
  });
}
