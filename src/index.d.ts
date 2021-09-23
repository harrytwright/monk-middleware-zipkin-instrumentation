import { Tracer } from 'zipkin'
import { TMiddleware } from 'monk'

declare function createZipkin({ tracer, remoteServiceName, serviceName, verbose }: {
	tracer: Tracer;
	remoteServiceName?: string;
	serviceName?: string;
	verbose?: Boolean;
}): TMiddleware;

export default createZipkin;
