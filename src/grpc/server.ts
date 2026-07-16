import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { getFeatureFlag } from '../services/flag.service.js';
import { fileURLToPath } from 'url';
import { flagEvents } from '../utils/eventEmitter.js';
import { wrapService } from '../utils/grpc-wrapper.js';
import type { AuthenticatedUnaryCall, AuthenticatedStreamCall } from '../types/grpc.types.js';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

type FlagRequest = {
    key: string;
    context?: Record<string, string>;
};

type FlagResponse = {
    enabled: boolean;
};

type SubscribeRequest = {
    key: string;
};

type FlagUpdate = {
    key: string;
    enabled: boolean;
    conditions: Record<string, string>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageDefinition = protoLoader.loadSync(
    path.join(__dirname, '../../proto/feature_flag.proto')
);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const flagProto = protoDescriptor.featureflag;

async function isFeatureEnabled(
    call: AuthenticatedUnaryCall<FlagRequest, FlagResponse>,
    callback: grpc.sendUnaryData<FlagResponse>
) {
    try {
        const { key, context } = call.request;
        const tenantId = call.tenantId;
        const enabled = await getFeatureFlag(tenantId, key, context);
        callback(null, { enabled });
    } catch (error) {
        callback(
            {
                code: grpc.status.INTERNAL,
                message: 'Error checking feature flag',
            },
            null
        );
    }
}

async function streamFlags(call: AuthenticatedStreamCall<SubscribeRequest, FlagUpdate>) {
    console.log('A new gRPC Stream link has been opened');

    const onFlagUpdate = async (data: FlagUpdate) => {
        if (call.request.key && call.request.key !== data.key) return;

        call.write({
            key: data.key,
            enabled: data.enabled,
            conditions: data.conditions,
        });
    };

    flagEvents.on('flag_updated', onFlagUpdate);

    call.on('cancelled', () => {
        console.log('gRPC Stream link has been disconnected');
        flagEvents.removeListener('flag_updated', onFlagUpdate);
    });
}

const services = {
    isFeatureEnabled,
    streamFlags,
};

const wrappedServices = wrapService(services);

const server = new grpc.Server();
server.addService(flagProto.FlagService.service, wrappedServices);

let grpcPort = process.env.GRPC_PORT || '50051';

server.bindAsync(`0.0.0.0:${grpcPort}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Error starting gRPC server:', err);
        return;
    }
    console.log(`gRPC server started on 0.0.0.0t:${port}`);
});
