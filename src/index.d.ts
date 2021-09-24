import { Tracer } from 'zipkin'
import { TMiddleware } from 'monk'

interface BinaryOptions {
	aggregate?: (args: Object) => Map<string, string>;
	bulkWrite?: (args: Object) => Map<string, string>;
	count?: (args: Object) => Map<string, string>;
	createIndex?: (args: Object) => Map<string, string>;
	distinct?: (args: Object) => Map<string, string>;
	dropIndex?: (args: Object) => Map<string, string>;
	find?: (args: Object) => Map<string, string>;
	findOne?: (args: Object) => Map<string, string>;
	findOneAndDelete?: (args: Object) => Map<string, string>;
	findOneAndUpdate?: (args: Object) => Map<string, string>;
	insert?: (args: Object) => Map<string, string>;
	remove?: (args: Object) => Map<string, string>;
}

declare function createZipkin({ tracer, remoteServiceName, serviceName, verbose, binaryOpts }: {
	tracer: Tracer;
	remoteServiceName?: string;
	serviceName?: string;
	verbose?: Boolean;
	binaryOpts?: BinaryOptions;
}): TMiddleware;

export default createZipkin;
